import React, { useEffect, useState } from "react";
import {
  IconX,
  IconDownload,
  IconUpload,
  IconTrash,
  IconClock,
  IconFile,
  IconCheck,
  IconAlertTriangle,
  IconHistory,
  IconUser,
  IconTooth,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import { DentesSelector } from "@/components/DentesSelector";
import {
  uploadOrderFile,
  formatFileSize,
  ALLOWED_EXTENSIONS,
  MAX_FILE_MB,
  getFileExtension,
  sanitizeFileName,
} from "@/lib/storage-upload";

export type OrderStage = "recebido" | "producao" | "cq" | "pronto" | "entregue";

const STAGE_ORDER: OrderStage[] = ["recebido", "producao", "cq", "pronto", "entregue"];

const STAGE_LABELS: Record<OrderStage, string> = {
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

const STAGE_ACCENT: Record<OrderStage, { bg: string; text: string; dot: string; border: string }> = {
  recebido: { bg: "bg-info-tint", text: "text-info", dot: "#2D6FDB", border: "border-info/30" },
  producao: { bg: "bg-primary-tint", text: "text-primary-tint-foreground", dot: "#4C5FF5", border: "border-primary/30" },
  cq: { bg: "bg-warning-tint", text: "text-warning", dot: "#9A6710", border: "border-warning/30" },
  pronto: { bg: "bg-success-tint", text: "text-success", dot: "#28854F", border: "border-success/30" },
  entregue: { bg: "bg-surface-1", text: "text-muted-foreground", dot: "#9497A6", border: "border-border" },
};

export interface OrderDetailData {
  id: string;
  status: OrderStage | "rascunho";
  valor: number;
  paciente: string | null;
  criado_em: string;
  data_desejada: string | null;
  dentist_id: string | null;
  lab_id: string;
  product_id: string | null;
  dentes: string[] | null;
  cor: string | null;
  material: string | null;
  unidades: number | null;
  observacoes: string | null;
  urgente: boolean | null;
  cro_pendente?: string | null;
  uf_pendente?: string | null;
  nome_dentista_pendente?: string | null;
  dentists?: {
    id: string;
    nome: string;
    cro: string | null;
    uf: string | null;
  } | null;
  products?: {
    id?: string;
    nome: string;
  } | null;
}

export interface OrderFileItem {
  id: string;
  order_id: string;
  tipo: string;
  nome_original: string;
  storage_path: string;
  tamanho_bytes: number;
  content_type: string | null;
  enviado_por: string | null;
  criado_em: string;
}

export interface OrderEventItem {
  id: string;
  order_id: string;
  tipo: "status" | "arquivo";
  descricao: string;
  de_status: string | null;
  para_status: string | null;
  autor: string | null;
  criado_em: string;
}

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  userRole: "lab" | "dentist" | "admin";
  currentUserId?: string | null;
  onOrderStatusChanged?: (orderId: string, newStatus: OrderStage) => void;
  onOrderUpdated?: () => void;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return iso;
  }
}

export function OrderDetailModal({
  orderId,
  isOpen,
  onClose,
  userRole,
  currentUserId,
  onOrderStatusChanged,
  onOrderUpdated,
}: OrderDetailModalProps) {
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [files, setFiles] = useState<OrderFileItem[]>([]);
  const [events, setEvents] = useState<OrderEventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId || !isOpen) {
      setOrder(null);
      setFiles([]);
      setEvents([]);
      return;
    }

    loadAll();

    // Assinar Realtime na tabela orders
    const channel = supabase
      .channel(`order-realtime-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          const updated = payload.new as OrderDetailData;
          setOrder((prev) => (prev ? { ...prev, ...updated } : prev));
          loadEvents();
          if (onOrderStatusChanged && updated.status && updated.status !== "rascunho") {
            onOrderStatusChanged(orderId, updated.status as OrderStage);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, isOpen]);

  async function loadAll() {
    if (!orderId) return;
    setLoading(true);
    setStatusError(null);
    setStatusSuccess(null);
    try {
      await Promise.all([loadOrder(), loadFiles(), loadEvents()]);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrder() {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, status, valor, paciente, criado_em, data_desejada, dentist_id, lab_id, product_id, dentes, cor, material, unidades, observacoes, urgente, cro_pendente, uf_pendente, nome_dentista_pendente, dentists(id, nome, cro, uf), products(id, nome)"
      )
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Erro ao carregar pedido:", error);
      return;
    }
    setOrder(data as unknown as OrderDetailData);
  }

  async function loadFiles() {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("order_files")
      .select("id, order_id, tipo, nome_original, storage_path, tamanho_bytes, content_type, enviado_por, criado_em")
      .eq("order_id", orderId)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error("Erro ao carregar arquivos:", error);
      return;
    }
    setFiles((data ?? []) as OrderFileItem[]);
  }

  async function loadEvents() {
    if (!orderId) return;
    const { data, error } = await supabase
      .from("order_events")
      .select("id, order_id, tipo, descricao, de_status, para_status, autor, criado_em")
      .eq("order_id", orderId)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error("Erro ao carregar histórico de eventos:", error);
      return;
    }
    setEvents((data ?? []) as OrderEventItem[]);
  }

  async function handleDownload(file: OrderFileItem) {
    try {
      setDownloadingId(file.id);
      const { data, error } = await supabase.storage
        .from("order-files")
        .createSignedUrl(file.storage_path, 60, {
          download: file.nome_original,
        });

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Não foi possível gerar link assinado para download.");
      }

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = file.nome_original;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert(`Falha ao baixar arquivo: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleStatusChange(targetStage: OrderStage) {
    if (!order || order.status === targetStage) return;

    if (targetStage === "entregue") {
      const confirmDeliver = window.confirm(
        "Confirmar a entrega deste pedido? Esta ação finaliza a produção."
      );
      if (!confirmDeliver) return;
    }

    setStatusUpdating(true);
    setStatusError(null);
    setStatusSuccess(null);

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: targetStage })
        .eq("id", order.id);

      if (error) throw error;

      setOrder((prev) => (prev ? { ...prev, status: targetStage } : null));
      setStatusSuccess(`Status atualizado para "${STAGE_LABELS[targetStage]}".`);
      await loadEvents();
      if (onOrderStatusChanged) {
        onOrderStatusChanged(order.id, targetStage);
      }
      if (onOrderUpdated) {
        onOrderUpdated();
      }
    } catch (err: any) {
      setStatusError(`Erro ao atualizar status: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !order) return;
    e.target.value = "";
    setUploadError(null);

    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setUploadError(`Extensão .${ext || "desconhecida"} não permitida. Aceitos: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setUploadError(`Arquivo excede o limite máximo permitido de ${MAX_FILE_MB}MB.`);
      return;
    }

    setUploadProgress(0);
    const tempPath = `${order.lab_id}/${order.id}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

    try {
      await uploadOrderFile({
        bucket: "order-files",
        path: tempPath,
        file,
        onProgress: (pct) => setUploadProgress(pct),
      });

      const { data: userRes } = await supabase.auth.getUser();
      const currentUid = userRes.user?.id || currentUserId;

      const slotTipo = userRole === "lab" ? "Laboratório" : "Dentista";

      const { error: insertErr } = await supabase.from("order_files").insert({
        order_id: order.id,
        tipo: slotTipo,
        nome_original: file.name,
        storage_path: tempPath,
        tamanho_bytes: file.size,
        content_type: file.type || null,
        enviado_por: currentUid,
      });

      if (insertErr) throw insertErr;

      await loadFiles();
      await loadEvents();
    } catch (err: any) {
      setUploadError(`Erro no envio: ${err.message}`);
    } finally {
      setUploadProgress(null);
    }
  }

  async function handleDeleteFile(file: OrderFileItem) {
    if (!window.confirm(`Deseja realmente excluir o arquivo "${file.nome_original}"?`)) return;

    try {
      await supabase.storage.from("order-files").remove([file.storage_path]);
      const { error } = await supabase.from("order_files").delete().eq("id", file.id);
      if (error) throw error;
      await loadFiles();
      await loadEvents();
    } catch (err: any) {
      alert(`Falha ao excluir arquivo: ${err.message}`);
    }
  }

  if (!isOpen) return null;

  const dentistName = order?.dentists?.nome || order?.nome_dentista_pendente || "Dentista N/D";
  const croDisplay = order?.dentist_id
    ? `${order.dentists?.cro || "—"}-${order.dentists?.uf || ""}`
    : `${order?.cro_pendente || "—"}-${order?.uf_pendente || ""}`;

  // Quem pode enviar arquivo:
  // Lab pode enviar se status != 'entregue'
  // Dentista pode enviar se status == 'recebido'
  const canUploadFile =
    userRole === "lab"
      ? order?.status !== "entregue" && order?.status !== "rascunho"
      : userRole === "dentist"
      ? order?.status === "recebido"
      : false;

  // Agrupamento de arquivos por rótulo
  const groupedFiles: Record<string, OrderFileItem[]> = {};
  files.forEach((f) => {
    if (!groupedFiles[f.tipo]) groupedFiles[f.tipo] = [];
    groupedFiles[f.tipo].push(f);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-surface-2 border border-border shadow-2xl overflow-hidden">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-surface-1">
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-2 border border-border text-foreground">
                #{order?.id.slice(0, 8)}
              </span>

              {order?.urgente && (
                <span className="rounded-full bg-error-tint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-error">
                  Urgente
                </span>
              )}

              {order?.status && order.status !== "rascunho" && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STAGE_ACCENT[order.status as OrderStage].bg} ${STAGE_ACCENT[order.status as OrderStage].text}`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STAGE_ACCENT[order.status as OrderStage].dot }}
                  />
                  {STAGE_LABELS[order.status as OrderStage]}
                </span>
              )}
            </div>

            <h2 className="text-lg font-bold text-foreground truncate">
              {order?.products?.nome || "Serviço de Prótese"}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                Paciente: <strong className="text-foreground">{order?.paciente || "—"}</strong>
              </span>
              <span>
                Dentista: <strong className="text-foreground">{dentistName}</strong>{" "}
                <span className="text-[11px] font-mono">(CRO {croDisplay})</span>
              </span>
              <span>
                Enviado em: <strong className="text-foreground">{order ? formatDate(order.criado_em) : "—"}</strong>
              </span>
              {order?.data_desejada && (
                <span>
                  Entrega desejada: <strong className="text-primary">{formatDate(order.data_desejada)}</strong>
                </span>
              )}
              <span>
                Valor:{" "}
                <strong className="text-foreground font-mono">
                  {order ? `R$ ${Number(order.valor).toFixed(2)}` : "—"}
                </strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground transition"
            title="Fechar detalhe do pedido"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Mensagens de Feedback de Status */}
        {statusError && (
          <div className="bg-error/10 border-b border-error/20 px-5 py-2.5 text-xs text-error">
            {statusError}
          </div>
        )}
        {statusSuccess && (
          <div className="bg-success/10 border-b border-success/20 px-5 py-2.5 text-xs text-success">
            {statusSuccess}
          </div>
        )}

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Carregando detalhes do pedido...
            </div>
          ) : (
            <>
              {/* ETAPAS DE STATUS (Visão do Laboratório) */}
              {userRole === "lab" && (
                <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Atualizar Etapa do Pedido
                    </span>
                    {statusUpdating && (
                      <span className="text-xs text-primary font-medium animate-pulse">
                        Atualizando...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {STAGE_ORDER.map((stage) => {
                      const isCurrent = order?.status === stage;
                      const a = STAGE_ACCENT[stage];
                      return (
                        <button
                          key={stage}
                          type="button"
                          disabled={statusUpdating || isCurrent}
                          onClick={() => handleStatusChange(stage)}
                          className={`rounded-lg px-3 py-2 text-xs font-semibold transition border flex flex-col items-center justify-center gap-1 ${
                            isCurrent
                              ? `${a.bg} ${a.text} ${a.border} ring-2 ring-primary/20 shadow-xs font-bold`
                              : "bg-surface-2 border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: isCurrent ? a.dot : "#9497A6" }}
                          />
                          <span>{STAGE_LABELS[stage]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DADOS DO PEDIDO */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Informações Clínicas do Pedido
                </h3>

                {/* Grade FDI de Dentes (Se preenchida) */}
                {order?.dentes && order.dentes.length > 0 && (
                  <div className="space-y-2">
                    <DentesSelector selectedTeeth={order.dentes} readOnly={true} />
                  </div>
                )}

                {/* Grid com Cor, Material, Unidades */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/60">
                  {order?.cor && (
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs">
                      <span className="text-muted-foreground block text-[11px]">Cor Selecionada</span>
                      <strong className="text-foreground text-sm font-semibold">{order.cor}</strong>
                    </div>
                  )}

                  {order?.material && (
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs">
                      <span className="text-muted-foreground block text-[11px]">Material</span>
                      <strong className="text-foreground text-sm font-semibold">{order.material}</strong>
                    </div>
                  )}

                  {order?.unidades && (
                    <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs">
                      <span className="text-muted-foreground block text-[11px]">Unidades</span>
                      <strong className="text-foreground text-sm font-semibold">{order.unidades} un.</strong>
                    </div>
                  )}
                </div>

                {/* Observações Clínicas (Se preenchida) */}
                {order?.observacoes && (
                  <div className="rounded-lg bg-surface-2 border border-border p-3 text-xs space-y-1">
                    <span className="text-muted-foreground block text-[11px] font-medium">
                      Observações Clínicas do Dentista
                    </span>
                    <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                      {order.observacoes}
                    </p>
                  </div>
                )}
              </div>

              {/* ARQUIVOS DO PEDIDO */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Arquivos e Anexos ({files.length})
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Modelos 3D, radiografias, fotos e instruções do pedido
                    </p>
                  </div>
                </div>

                {/* Upload de novos arquivos (quando permitido) */}
                {canUploadFile && (
                  <div className="rounded-lg border-2 border-dashed border-border bg-surface-2 p-3 text-center space-y-2">
                    <input
                      type="file"
                      id="modal-order-file-input"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <label
                      htmlFor="modal-order-file-input"
                      className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                    >
                      <IconUpload size={16} />
                      <span>
                        {userRole === "lab"
                          ? "Enviar arquivo ao dentista (planejamento, STL para aprovação)"
                          : "Enviar arquivo adicional ao laboratório"}
                      </span>
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      STL, PLY, OBJ, ZIP, JPG, PNG, PDF (Máx {MAX_FILE_MB}MB)
                    </p>

                    {uploadProgress !== null && (
                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                          <span>Enviando...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-150"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {uploadError && (
                      <p className="text-xs text-error font-medium">{uploadError}</p>
                    )}
                  </div>
                )}

                {/* Listagem agrupada de arquivos */}
                {Object.keys(groupedFiles).length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum arquivo anexado a este pedido.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedFiles).map(([slotName, slotFiles]) => (
                      <div key={slotName} className="space-y-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {slotName}
                        </span>

                        <div className="grid gap-2 sm:grid-cols-2">
                          {slotFiles.map((f) => {
                            const isDentistSender =
                              f.enviado_por &&
                              order?.dentists &&
                              f.enviado_por === (order as any).dentists?.user_id;
                            const senderLabel =
                              f.tipo === "Laboratório"
                                ? "Laboratório"
                                : f.tipo === "Dentista"
                                ? "Dentista"
                                : "Anexo do Pedido";

                            const canDelete =
                              currentUserId &&
                              f.enviado_por === currentUserId &&
                              (userRole === "lab"
                                ? order?.status !== "entregue"
                                : order?.status === "recebido");

                            return (
                              <div
                                key={f.id}
                                className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 border border-border p-3 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <IconFile size={20} className="text-primary shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-foreground truncate" title={f.nome_original}>
                                      {f.nome_original}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                      <span>{formatFileSize(f.tamanho_bytes)}</span>
                                      <span>•</span>
                                      <span>{senderLabel}</span>
                                      <span>•</span>
                                      <span>{formatDate(f.criado_em)}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={downloadingId === f.id}
                                    onClick={() => handleDownload(f)}
                                    className="inline-flex items-center gap-1 rounded-md bg-surface-1 border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-2 transition disabled:opacity-50"
                                    title="Baixar arquivo"
                                  >
                                    <IconDownload size={13} />
                                    <span>{downloadingId === f.id ? "..." : "Baixar"}</span>
                                  </button>

                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(f)}
                                      className="p-1 rounded-md text-muted-foreground hover:text-error hover:bg-surface-1 transition"
                                      title="Excluir arquivo"
                                    >
                                      <IconTrash size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* HISTÓRICO E LINHA DO TEMPO */}
              <div className="rounded-xl border border-border bg-surface-1 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IconHistory size={16} className="text-muted-foreground" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Linha do Tempo e Eventos
                  </h3>
                </div>

                {events.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">
                    Nenhum evento registrado até o momento.
                  </p>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {events.map((ev) => {
                      const isStatus = ev.tipo === "status";
                      return (
                        <div key={ev.id} className="relative flex flex-col text-xs space-y-0.5">
                          <span
                            className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-surface-1 flex items-center justify-center ${
                              isStatus ? "bg-primary" : "bg-info"
                            }`}
                          />
                          <span className="font-semibold text-foreground">{ev.descricao}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDateTime(ev.criado_em)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
