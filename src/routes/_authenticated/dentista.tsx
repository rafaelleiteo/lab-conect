import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  IconLogout,
  IconPackage,
  IconList,
  IconChevronDown,
  IconPlus,
  IconBook2,
  IconFileText,
  IconReceipt,
  IconTool,
  IconGift,
  IconUser,
  IconUserCircle,
  IconClock,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconUpload,
  IconFile,
  IconTrash,
  IconBuildingStore,
} from "@tabler/icons-react";
import { ParcLabsLogo } from "@/components/ParcLabsLogo";
import { LabAvatar } from "@/components/LabAvatar";
import { supabase } from "@/integrations/supabase/client";
import { createOrderPayment, getPaymentStatus } from "@/lib/payments.functions";
import { resolveLabSubdomain } from "@/lib/domain-context";
import {
  registrarReivindicacoes,
  contarReivindicacoesPendentes,
} from "@/lib/order-claims.functions";
import { DentesSelector } from "@/components/DentesSelector";
import { Switch } from "@/components/ui/switch";
import { OrderDetailModal, OrderStage } from "@/components/OrderDetailModal";
import {
  CamposPedido,
  DEFAULT_CAMPOS_PEDIDO,
} from "@/integrations/supabase/types";
import {
  uploadOrderFile,
  formatFileSize,
  ALLOWED_EXTENSIONS,
  MAX_FILE_MB,
  getFileExtension,
  sanitizeFileName,
} from "@/lib/storage-upload";

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const VITA_CLASSICAL = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
  "Outra",
];

type PaymentInfo = {
  paymentId: string;
  status: string;
  invoiceUrl?: string;
  pixPayload?: string;
  pixQrImageBase64?: string;
};

type Product = {
  id: string;
  nome: string;
  descricao?: string | null;
  preco: number;
  prazo_dias: number;
  lab_id: string;
  arquivos_obrigatorios?: string[];
  campos_pedido?: CamposPedido;
  materiais?: string[];
};

type Dentist = {
  id: string;
  user_id?: string;
  nome: string;
  email: string;
  cro: string | null;
  uf: string | null;
  telefone?: string | null;
};

type Lab = {
  id: string;
  nome: string;
  subdominio: string;
  logo_url: string | null;
  visivel_diretorio: boolean;
};

type Order = {
  id: string;
  status: string;
  valor: number;
  paciente: string | null;
  criado_em: string;
  lab_id: string;
  product_id?: string;
  products: { nome: string } | null;
  asaas_payment_id?: string | null;
  dentes?: string[] | null;
  cor?: string | null;
  material?: string | null;
  unidades?: number | null;
  data_desejada?: string | null;
  observacoes?: string | null;
  urgente?: boolean;
};

type SlotFile = {
  id?: string;
  name: string;
  size: number;
  path: string;
  progress: number;
  uploading?: boolean;
};

type AcademyContent = {
  id: string;
  tipo: "ebook" | "curso" | "tutorial";
  titulo: string;
  descricao: string;
  url_conteudo: string;
  capa_url: string | null;
  criado_em: string;
};

type Benefit = {
  id: string;
  titulo: string;
  descricao: string;
  tipo: string;
  parceiro: string;
  url_link: string | null;
  criado_em: string;
};

export const Route = createFileRoute("/_authenticated/dentista")({
  component: DentistPortal,
});

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  recebido: "Recebido",
  producao: "Em produção",
  cq: "Controle de qualidade",
  pronto: "Pronto",
  entregue: "Entregue",
};

type TabType =
  | "produtos"
  | "solicitar"
  | "pedidos"
  | "faturas"
  | "academy"
  | "tools"
  | "beneficios"
  | "meuperfil";

function DentistPortal() {
  const navigate = useNavigate();
  const serverFnRegistrarReivindicacoes = useServerFn(registrarReivindicacoes);
  const serverFnContarReivindicacoes = useServerFn(contarReivindicacoesPendentes);

  const [tab, setTab] = useState<TabType>("produtos");
  const [dentist, setDentist] = useState<Dentist | null>(null);
  const [pendingClaimsCount, setPendingClaimsCount] = useState<number>(0);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [currentLabId, setCurrentLabId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [academy, setAcademy] = useState<AcademyContent[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [academyLoading, setAcademyLoading] = useState(true);
  const [benefitsLoading, setBenefitsLoading] = useState(true);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paciente, setPaciente] = useState("");
  const [dentes, setDentes] = useState<string[]>([]);
  const [cor, setCor] = useState("");
  const [corCustomizada, setCorCustomizada] = useState("");
  const [material, setMaterial] = useState("");
  const [unidades, setUnidades] = useState<number>(1);
  const [dataDesejada, setDataDesejada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [urgente, setUrgente] = useState(false);

  // Draft and attachments state
  const [draftOrderId, setDraftOrderId] = useState<string | null>(null);
  const [filesBySlot, setFilesBySlot] = useState<Record<string, SlotFile[]>>({});
  const [slotErrors, setSlotErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Confirmation modal state
  const [submittedOrder, setSubmittedOrder] = useState<{
    id: string;
    productName: string;
    paciente: string;
    valor: number;
    filesCount: number;
    dentes?: string[] | null;
    cor?: string | null;
    material?: string | null;
    unidades?: number | null;
  } | null>(null);

  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null);
  const [paymentFor, setPaymentFor] = useState<Order | null>(null);
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentErr, setPaymentErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [labParamNotice, setLabParamNotice] = useState<string | null>(null);
  const [showLabPicker, setShowLabPicker] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const createPayment = useServerFn(createOrderPayment);
  const fetchPaymentStatus = useServerFn(getPaymentStatus);

  // Subdomain / URL parameter context resolution (Block 2)
  const labSubdomainFromUrl = useMemo(() => resolveLabSubdomain(), []);

  const currentLab = useMemo(
    () => labs.find((l) => l.id === currentLabId) ?? null,
    [labs, currentLabId],
  );

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data: dent } = await supabase
        .from("dentists")
        .select("id, nome, email, cro, uf, user_id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!dent) return;
      setDentist(dent as Dentist);
      try {
        await serverFnRegistrarReivindicacoes();
        const resCount = await serverFnContarReivindicacoes();
        setPendingClaimsCount(resCount.count || 0);
      } catch (err) {
        console.error("Falha ao registrar/contar reivindicacoes:", err);
      }
      await reloadLinks(dent.id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      const { data: ac } = await supabase
        .from("academy_content")
        .select("id, tipo, titulo, descricao, url_conteudo, capa_url, criado_em")
        .order("criado_em", { ascending: false });
      setAcademy((ac ?? []) as AcademyContent[]);
      setAcademyLoading(false);

      const { data: ben } = await supabase
        .from("benefits")
        .select("id, titulo, descricao, tipo, parceiro, url_link, criado_em")
        .order("criado_em", { ascending: false });
      setBenefits((ben ?? []) as Benefit[]);
      setBenefitsLoading(false);
    })();
  }, []);

  async function reloadLinks(dentistId: string) {
    const { data: linkRows } = await supabase
      .from("dentist_lab_links")
      .select("lab_id")
      .eq("dentist_id", dentistId);

    const labIds = (linkRows ?? []).map((r) => r.lab_id).filter(Boolean);

    let linked: Lab[] = [];
    if (labIds.length > 0) {
      const { data: labsData } = await supabase
        .from("labs_visiveis")
        .select("id, nome, subdominio, logo_url, visivel_diretorio")
        .in("id", labIds);

      linked = (labsData ?? []) as Lab[];
    }
    setLabs(linked);

    // Context resolution: se subdominio esta na URL, tenta selecionar
    if (labSubdomainFromUrl) {
      if (linked.length > 0) {
        const matched = linked.find((l) => l.subdominio.toLowerCase() === labSubdomainFromUrl);
        if (matched) {
          setCurrentLabId(matched.id);
          return;
        }
      }
      setLabParamNotice(`O laboratório "${labSubdomainFromUrl}" não foi encontrado ou não está vinculado.`);
    }

    if (linked.length > 0 && !currentLabId) {
      setCurrentLabId(linked[0].id);
    }
  }

  useEffect(() => {
    if (!currentLabId || !dentist) return;
    (async () => {
      const { data: prods } = await supabase
        .from("products")
        .select(
          "id, nome, descricao, preco, prazo_dias, lab_id, arquivos_obrigatorios, campos_pedido, materiais"
        )
        .eq("lab_id", currentLabId)
        .eq("ativo", true);
      setProducts((prods ?? []) as unknown as Product[]);

      await loadOrders(dentist.id, currentLabId);
    })();
  }, [currentLabId, dentist]);

  async function loadOrders(dentistId: string, labId: string) {
    const { data: ord } = await supabase
      .from("orders")
      .select(
        "id, status, valor, paciente, criado_em, lab_id, product_id, products(nome), asaas_payment_id, dentes, cor, material, unidades, data_desejada, observacoes, urgente"
      )
      .eq("dentist_id", dentistId)
      .eq("lab_id", labId)
      .order("criado_em", { ascending: false });
    setOrders((ord ?? []) as unknown as Order[]);
  }

  async function openPayment(order: Order) {
    setPaymentFor(order);
    setPayment(null);
    setPaymentErr(null);
    setCopied(false);
    setPaymentLoading(true);
    try {
      const p = await createPayment({ data: { orderId: order.id } });
      setPayment(p);
    } catch (e) {
      setPaymentErr(e instanceof Error ? e.message : "Falha ao gerar cobrança");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function refreshPaymentStatus(orderId: string) {
    try {
      const r = await fetchPaymentStatus({ data: { orderId } });
      setPayment((cur) => (cur ? { ...cur, status: r.status } : cur));
    } catch {
      // ignore
    }
  }

  function resetOrderForm() {
    setSelectedProduct(null);
    setPaciente("");
    setDentes([]);
    setCor("");
    setCorCustomizada("");
    setMaterial("");
    setUnidades(1);
    setDataDesejada("");
    setObservacoes("");
    setUrgente(false);
    setDraftOrderId(null);
    setFilesBySlot({});
    setSlotErrors({});
  }

  // Configuração ativa de campos do produto selecionado
  const campos: CamposPedido = useMemo(() => {
    return selectedProduct?.campos_pedido ?? DEFAULT_CAMPOS_PEDIDO;
  }, [selectedProduct]);

  // Cálculo de valor total (preco x unidades se unidades ligadas)
  const totalCalculado = useMemo(() => {
    if (!selectedProduct) return 0;
    if (campos.unidades !== "desligado") {
      return Number(selectedProduct.preco) * Math.max(1, unidades || 1);
    }
    return Number(selectedProduct.preco);
  }, [selectedProduct, campos.unidades, unidades]);

  // Alerta de data estimada
  const isDateBeforeEstimate = useMemo(() => {
    if (!dataDesejada || !selectedProduct) return false;
    const picked = new Date(dataDesejada + "T00:00:00");
    const minTarget = new Date();
    minTarget.setDate(minTarget.getDate() + (selectedProduct.prazo_dias || 1));
    return picked < minTarget;
  }, [dataDesejada, selectedProduct]);

  // Slots de arquivos
  const fileSlots = useMemo(() => {
    if (!selectedProduct) return [];
    const list: { name: string; required: boolean }[] = (
      selectedProduct.arquivos_obrigatorios || []
    ).map((name) => ({ name, required: true }));
    list.push({ name: "Outros arquivos", required: false });
    return list;
  }, [selectedProduct]);

  // Validação para habilitar o envio
  const isReadyToSubmit = useMemo(() => {
    if (!selectedProduct || !paciente.trim()) return false;
    if (isUploading) return false;

    if (campos.dentes === "obrigatorio" && dentes.length === 0) return false;
    if (campos.cor === "obrigatorio") {
      if (!cor.trim()) return false;
      if (cor === "Outra" && !corCustomizada.trim()) return false;
    }
    if (campos.material === "obrigatorio" && !material.trim()) return false;
    if (campos.unidades === "obrigatorio" && (!unidades || unidades < 1)) return false;
    if (campos.data_desejada === "obrigatorio" && !dataDesejada.trim()) return false;
    if (campos.observacoes === "obrigatorio" && !observacoes.trim()) return false;

    // Cada slot obrigatório deve ter pelo menos 1 arquivo anexado com sucesso
    for (const slot of fileSlots.filter((s) => s.required)) {
      const files = filesBySlot[slot.name] || [];
      const valid = files.filter((f) => !f.uploading);
      if (valid.length === 0) return false;
    }

    return true;
  }, [
    selectedProduct,
    paciente,
    isUploading,
    campos,
    dentes,
    cor,
    corCustomizada,
    material,
    unidades,
    dataDesejada,
    observacoes,
    fileSlots,
    filesBySlot,
  ]);

  async function handleFileSelected(slotName: string, file: File) {
    if (!dentist || !currentLabId || !selectedProduct) return;
    setSlotErrors((prev) => ({ ...prev, [slotName]: "" }));

    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotName]: `Extensão .${ext || "desconhecida"} não permitida. Aceitos: ${ALLOWED_EXTENSIONS.join(", ")}`,
      }));
      return;
    }

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setSlotErrors((prev) => ({
        ...prev,
        [slotName]: `Arquivo excede o limite máximo permitido de ${MAX_FILE_MB}MB.`,
      }));
      return;
    }

    setIsUploading(true);
    let activeDraftId = draftOrderId;

    // Criar rascunho se ainda não existir
    if (!activeDraftId) {
      try {
        const { data: newOrder, error: orderErr } = await supabase
          .from("orders")
          .insert({
            dentist_id: dentist.id,
            lab_id: currentLabId,
            product_id: selectedProduct.id,
            valor: totalCalculado,
            paciente: paciente.trim() || "Rascunho",
            status: "rascunho",
          })
          .select("id")
          .single();

        if (orderErr) {
          setSlotErrors((prev) => ({
            ...prev,
            [slotName]: `Erro ao iniciar rascunho: ${orderErr.message}`,
          }));
          setIsUploading(false);
          return;
        }
        activeDraftId = newOrder.id;
        setDraftOrderId(activeDraftId);
      } catch (err: any) {
        setSlotErrors((prev) => ({ ...prev, [slotName]: `Erro: ${err.message}` }));
        setIsUploading(false);
        return;
      }
    }

    const tempPath = `${currentLabId}/${activeDraftId}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;
    const tempFile: SlotFile = {
      name: file.name,
      size: file.size,
      path: tempPath,
      progress: 0,
      uploading: true,
    };

    setFilesBySlot((prev) => ({
      ...prev,
      [slotName]: [...(prev[slotName] || []), tempFile],
    }));

    try {
      await uploadOrderFile({
        bucket: "order-files",
        path: tempPath,
        file,
        onProgress: (pct) => {
          setFilesBySlot((prev) => {
            const slotList = prev[slotName] || [];
            return {
              ...prev,
              [slotName]: slotList.map((f) =>
                f.path === tempPath ? { ...f, progress: pct } : f
              ),
            };
          });
        },
      });

      const { data: userRes } = await supabase.auth.getUser();
      const { data: fileRow, error: fileErr } = await supabase
        .from("order_files")
        .insert({
          order_id: activeDraftId,
          tipo: slotName,
          nome_original: file.name,
          storage_path: tempPath,
          tamanho_bytes: file.size,
          content_type: file.type || null,
          enviado_por: userRes.user?.id,
        })
        .select("id")
        .single();

      if (fileErr) {
        throw fileErr;
      }

      setFilesBySlot((prev) => {
        const slotList = prev[slotName] || [];
        return {
          ...prev,
          [slotName]: slotList.map((f) =>
            f.path === tempPath
              ? { ...f, id: fileRow.id, uploading: false, progress: 100 }
              : f
          ),
        };
      });
    } catch (err: any) {
      setSlotErrors((prev) => ({ ...prev, [slotName]: `Falha no upload: ${err.message}` }));
      setFilesBySlot((prev) => {
        const slotList = prev[slotName] || [];
        return {
          ...prev,
          [slotName]: slotList.filter((f) => f.path !== tempPath),
        };
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveFile(slotName: string, fileItem: SlotFile) {
    try {
      if (fileItem.path) {
        await supabase.storage.from("order-files").remove([fileItem.path]);
      }
      if (fileItem.id) {
        await supabase.from("order_files").delete().eq("id", fileItem.id);
      }
    } catch (err) {
      console.error("Erro ao remover arquivo:", err);
    }
    setFilesBySlot((prev) => ({
      ...prev,
      [slotName]: (prev[slotName] || []).filter((f) => f.path !== fileItem.path),
    }));
  }

  async function submitOrder() {
    if (!dentist || !selectedProduct || !currentLabId || !isReadyToSubmit) return;
    setCreating(true);

    const corFinal =
      campos.cor !== "desligado"
        ? cor === "Outra"
          ? corCustomizada.trim()
          : cor
        : null;
    const materialFinal = campos.material !== "desligado" ? material.trim() : null;
    const unidadesFinal = campos.unidades !== "desligado" ? Number(unidades || 1) : null;

    let finalOrderId = draftOrderId;
    let finalOrderData: any = null;

    if (draftOrderId) {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "recebido",
          paciente: paciente.trim(),
          valor: totalCalculado,
          dentes: campos.dentes !== "desligado" && dentes.length > 0 ? dentes : null,
          cor: corFinal,
          material: materialFinal,
          unidades: unidadesFinal,
          data_desejada:
            campos.data_desejada !== "desligado" && dataDesejada ? dataDesejada : null,
          observacoes:
            campos.observacoes !== "desligado" && observacoes.trim() ? observacoes.trim() : null,
          urgente: campos.urgente !== "desligado" ? urgente : false,
        })
        .eq("id", draftOrderId)
        .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
        .single();

      if (error) {
        setCreating(false);
        alert(error.message);
        return;
      }
      finalOrderData = data;
    } else {
      const { data, error } = await supabase
        .from("orders")
        .insert({
          dentist_id: dentist.id,
          lab_id: currentLabId,
          product_id: selectedProduct.id,
          status: "recebido",
          paciente: paciente.trim(),
          valor: totalCalculado,
          dentes: campos.dentes !== "desligado" && dentes.length > 0 ? dentes : null,
          cor: corFinal,
          material: materialFinal,
          unidades: unidadesFinal,
          data_desejada:
            campos.data_desejada !== "desligado" && dataDesejada ? dataDesejada : null,
          observacoes:
            campos.observacoes !== "desligado" && observacoes.trim() ? observacoes.trim() : null,
          urgente: campos.urgente !== "desligado" ? urgente : false,
        })
        .select("id, status, valor, paciente, criado_em, lab_id, products(nome)")
        .single();

      if (error) {
        setCreating(false);
        alert(error.message);
        return;
      }
      finalOrderId = data.id;
      finalOrderData = data;
    }

    setCreating(false);

    let totalFiles = 0;
    Object.values(filesBySlot).forEach((list) => {
      totalFiles += list.filter((f) => !f.uploading).length;
    });

    setSubmittedOrder({
      id: finalOrderId!,
      productName: selectedProduct.nome,
      paciente: paciente.trim(),
      valor: totalCalculado,
      filesCount: totalFiles,
      dentes: campos.dentes !== "desligado" && dentes.length > 0 ? dentes : null,
      cor: corFinal,
      material: materialFinal,
      unidades: unidadesFinal,
    });

    resetOrderForm();
    await loadOrders(dentist.id, currentLabId);
  }

  async function resumeDraft(order: Order) {
    const prod = products.find((p) => p.id === order.product_id) || null;
    setSelectedProduct(prod);
    setDraftOrderId(order.id);
    setPaciente(order.paciente || "");
    setDentes(order.dentes || []);
    if (order.cor) {
      if (VITA_CLASSICAL.includes(order.cor)) {
        setCor(order.cor);
      } else {
        setCor("Outra");
        setCorCustomizada(order.cor);
      }
    }
    setMaterial(order.material || "");
    setUnidades(order.unidades || 1);
    setDataDesejada(order.data_desejada || "");
    setObservacoes(order.observacoes || "");
    setUrgente(order.urgente || false);

    const { data: files } = await supabase
      .from("order_files")
      .select("id, tipo, nome_original, storage_path, tamanho_bytes")
      .eq("order_id", order.id);

    const grouped: Record<string, SlotFile[]> = {};
    for (const f of files ?? []) {
      if (!grouped[f.tipo]) grouped[f.tipo] = [];
      grouped[f.tipo].push({
        id: f.id,
        name: f.nome_original,
        size: Number(f.tamanho_bytes),
        path: f.storage_path,
        progress: 100,
        uploading: false,
      });
    }
    setFilesBySlot(grouped);
    setTab("solicitar");
  }

  async function deleteDraft(orderId: string) {
    if (!confirm("Tem certeza que deseja excluir este rascunho de pedido?")) return;

    const { data: files } = await supabase
      .from("order_files")
      .select("storage_path")
      .eq("order_id", orderId);

    if (files && files.length > 0) {
      const paths = files.map((f) => f.storage_path);
      await supabase.storage.from("order-files").remove(paths);
    }

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) {
      alert("Erro ao excluir rascunho: " + error.message);
      return;
    }
    if (draftOrderId === orderId) {
      resetOrderForm();
    }
    if (dentist && currentLabId) {
      await loadOrders(dentist.id, currentLabId);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const academyItems = useMemo(() => academy.filter((a) => a.tipo !== "tutorial"), [academy]);
  const toolsItems = useMemo(() => academy.filter((a) => a.tipo === "tutorial"), [academy]);

  const billedOrders = useMemo(
    () => orders.filter((o) => o.status !== "rascunho"),
    [orders]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0B0F1E] border-b border-[#0B0F1E] text-white">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {currentLab ? (
              <div className="flex items-center gap-2">
                <LabAvatar lab={currentLab} size={28} />
                <span className="text-sm font-bold text-white tracking-wide">{currentLab.nome}</span>
              </div>
            ) : (
              <ParcLabsLogo variant="dark" size="sm" />
            )}

            {!labSubdomainFromUrl && (
              <div className="relative">
                <button
                  onClick={() => setShowLabPicker((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/80 hover:bg-white/20 transition"
                >
                  <span>{currentLab ? "Trocar lab" : "Selecionar lab"}</span>
                  <IconChevronDown size={12} />
                </button>
                {showLabPicker && (
                  <div className="absolute top-8 left-0 z-50 w-64 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-2">
                    <p className="px-2 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Meus laboratórios
                    </p>
                    {labs.length === 0 ? (
                      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                        Nenhum laboratório vinculado.
                      </p>
                    ) : (
                      labs.map((lab) => (
                        <button
                          key={lab.id}
                          onClick={() => {
                            setCurrentLabId(lab.id);
                            setShowLabPicker(false);
                          }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-surface-1 ${
                            lab.id === currentLabId
                              ? "bg-primary-tint text-primary-tint-foreground"
                              : "text-foreground"
                          }`}
                        >
                          <LabAvatar lab={lab} size={22} />
                          <span className="truncate">{lab.nome}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <ParcLabsLogo variant="dark" size="sm" />
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1 hover:bg-white/10 transition"
                title="Meu Perfil"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xs">
                  {dentist?.nome?.charAt(0).toUpperCase() ?? "D"}
                </div>
              </button>
              {showProfileMenu && (
                <div className="absolute top-10 right-0 z-50 w-56 rounded-xl bg-surface-2 border border-border shadow-[var(--shadow-soft-lg)] p-2 text-foreground">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-semibold truncate">{dentist?.nome}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{dentist?.email}</p>
                  </div>
                  <button
                    onClick={signOut}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-error hover:bg-surface-1 transition"
                  >
                    <IconLogout size={16} /> Sair do sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-1 px-6 pb-2 overflow-x-auto">
          <TabButton
            active={tab === "produtos"}
            onClick={() => setTab("produtos")}
            icon={<IconPackage size={16} />}
          >
            Produtos
          </TabButton>
          <TabButton
            active={tab === "solicitar"}
            onClick={() => setTab("solicitar")}
            icon={<IconPlus size={16} />}
          >
            Solicitar Pedido
          </TabButton>
          <TabButton
            active={tab === "pedidos"}
            onClick={() => setTab("pedidos")}
            icon={<IconList size={16} />}
          >
            Meus Pedidos
          </TabButton>
          <TabButton
            active={tab === "faturas"}
            onClick={() => setTab("faturas")}
            icon={<IconReceipt size={16} />}
          >
            Faturas
          </TabButton>
          <TabButton
            active={tab === "academy"}
            onClick={() => setTab("academy")}
            icon={<IconBook2 size={16} />}
          >
            Cursos
          </TabButton>
          <TabButton
            active={tab === "tools"}
            onClick={() => setTab("tools")}
            icon={<IconTool size={16} />}
          >
            Tools
          </TabButton>
          <TabButton
            active={tab === "beneficios"}
            onClick={() => setTab("beneficios")}
            icon={<IconGift size={16} />}
          >
            Benefícios
          </TabButton>
          <TabButton
            active={tab === "meuperfil"}
            onClick={() => setTab("meuperfil")}
            icon={<IconUserCircle size={16} />}
          >
            Meu perfil
          </TabButton>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {labParamNotice && (
          <div className="mb-6 rounded-xl border border-warning/30 bg-warning-tint p-4 text-xs font-medium text-warning flex items-center justify-between">
            <span>{labParamNotice}</span>
            <button
              onClick={() => setLabParamNotice(null)}
              className="font-bold text-sm ml-2 text-warning hover:opacity-80 leading-none"
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        )}

        {labs.length === 0 && (tab === "produtos" || tab === "solicitar") ? (
          <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center max-w-lg mx-auto space-y-4 my-8 shadow-[var(--shadow-soft)]">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary-tint text-primary flex items-center justify-center">
              <IconBuildingStore size={24} />
            </div>
            <h3 className="text-base font-semibold text-foreground">Você ainda não está vinculado a um laboratório</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Você ainda não está vinculado a um laboratório. Peça ao seu laboratório o link da loja dele para começar.
            </p>
          </div>
        ) : (
          <>
            {/* Aba 1: Produtos */}
            {tab === "produtos" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Catálogo de Produtos e Serviços
              </h2>
              <p className="text-xs text-muted-foreground">
                Preços e prazos oficiais do {currentLab?.nome ?? "laboratório"}
              </p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.length === 0 ? (
                <div className="col-span-full p-8 text-center text-sm text-muted-foreground rounded-2xl border border-border bg-surface-2">
                  Nenhum produto cadastrado por este laboratório no momento.
                </div>
              ) : (
                products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{p.nome}</h3>
                      {p.descricao && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {p.descricao}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Prazo médio: {p.prazo_dias} dias úteis
                      </p>
                    </div>
                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
                      <span className="text-lg font-bold text-foreground">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(p.preco)}
                      </span>
                      <button
                        onClick={() => {
                          resetOrderForm();
                          setSelectedProduct(p);
                          setTab("solicitar");
                        }}
                        className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
                      >
                        Solicitar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Aba 2: Solicitar Pedido */}
        {tab === "solicitar" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Novo Pedido de Prótese
              </h2>
              <p className="text-xs text-muted-foreground">
                Envio direto para {currentLab?.nome}
                {draftOrderId && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-warning-tint text-warning">
                    Rascunho ativo #{draftOrderId.slice(0, 8)}
                  </span>
                )}
              </p>
            </header>

            <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-[var(--shadow-soft)] space-y-6">
              {/* Seleção do Produto */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Produto / Serviço <span className="text-error">*</span>
                </label>
                <select
                  value={selectedProduct?.id ?? ""}
                  onChange={(e) => {
                    const p = products.find((pr) => pr.id === e.target.value);
                    resetOrderForm();
                    setSelectedProduct(p ?? null);
                  }}
                  className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                >
                  <option value="">Selecione um produto...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} -{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(p.preco)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct && (
                <>
                  {/* Resumo de Preço e Prazo Estimado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-surface-1 border border-border p-4">
                    <div>
                      <span className="text-xs text-muted-foreground block">Valor do pedido</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold font-mono text-foreground">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(totalCalculado)}
                        </span>
                        {campos.unidades !== "desligado" && unidades > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({unidades} un. x{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(selectedProduct.preco)}
                            )
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="sm:text-right">
                      <span className="text-xs text-muted-foreground block">Prazo estimado</span>
                      <span className="text-xs font-semibold text-foreground inline-flex items-center sm:justify-end gap-1 mt-0.5">
                        <IconClock size={15} className="text-primary" />
                        {selectedProduct.prazo_dias} dias úteis
                      </span>
                    </div>
                  </div>

                  {/* Nome do Paciente (Sempre Obrigatório) */}
                  <div>
                    <label className="text-xs font-medium text-foreground">
                      Nome do Paciente <span className="text-error">*</span>
                    </label>
                    <input
                      type="text"
                      value={paciente}
                      onChange={(e) => setPaciente(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  {/* Campo: Dentes (FDI) */}
                  {campos.dentes !== "desligado" && (
                    <DentesSelector
                      selectedTeeth={dentes}
                      onChange={setDentes}
                      required={campos.dentes === "obrigatorio"}
                    />
                  )}

                  {/* Campo: Cor */}
                  {campos.cor !== "desligado" && (
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Cor (Escala Vita Classical){" "}
                        {campos.cor === "obrigatorio" && <span className="text-error">*</span>}
                      </label>
                      <select
                        value={cor}
                        onChange={(e) => setCor(e.target.value)}
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Selecione uma cor...</option>
                        {VITA_CLASSICAL.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {cor === "Outra" && (
                        <input
                          type="text"
                          value={corCustomizada}
                          onChange={(e) => setCorCustomizada(e.target.value)}
                          placeholder="Informe a cor personalizada (ex: BL1, 3D Master 2M2...)"
                          className="mt-2 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      )}
                    </div>
                  )}

                  {/* Campo: Material */}
                  {campos.material !== "desligado" && (
                    <div>
                      <label className="text-xs font-medium text-foreground">
                        Material{" "}
                        {campos.material === "obrigatorio" && <span className="text-error">*</span>}
                      </label>
                      {selectedProduct.materiais && selectedProduct.materiais.length > 0 ? (
                        <select
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                        >
                          <option value="">Selecione o material...</option>
                          {selectedProduct.materiais.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={material}
                          onChange={(e) => setMaterial(e.target.value)}
                          placeholder="Ex: Zircônia Translúcida, Resina..."
                          className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                        />
                      )}
                    </div>
                  )}

                  {/* Campo: Unidades */}
                  {campos.unidades !== "desligado" && (
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          Unidades (1 a 32){" "}
                          {campos.unidades === "obrigatorio" && (
                            <span className="text-error">*</span>
                          )}
                        </label>
                        <span className="text-xs font-mono font-semibold text-primary">
                          Total:{" "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(totalCalculado)}
                        </span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={32}
                        value={unidades}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setUnidades(isNaN(val) ? 1 : Math.max(1, Math.min(32, val)));
                        }}
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm font-mono outline-none focus:border-primary"
                      />
                    </div>
                  )}

                  {/* Campo: Data desejada */}
                  {campos.data_desejada !== "desligado" && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        Data desejada de entrega{" "}
                        {campos.data_desejada === "obrigatorio" && (
                          <span className="text-error">*</span>
                        )}
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={dataDesejada}
                        onChange={(e) => setDataDesejada(e.target.value)}
                        className="w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      {isDateBeforeEstimate && (
                        <div className="rounded-lg bg-warning/10 border border-warning/30 p-2.5 text-xs text-warning flex items-center gap-2">
                          <IconAlertTriangle size={15} className="shrink-0" />
                          <span>
                            O prazo médio deste serviço é {selectedProduct.prazo_dias} dias úteis.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Campo: Observações */}
                  {campos.observacoes !== "desligado" && (
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-foreground">
                          Observações{" "}
                          {campos.observacoes === "obrigatorio" && (
                            <span className="text-error">*</span>
                          )}
                        </label>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {observacoes.length}/1000
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        maxLength={1000}
                        value={observacoes}
                        onChange={(e) => setObservacoes(e.target.value)}
                        placeholder="Instruções clínicas adicionais, preferências, detalhes do caso..."
                        className="mt-1.5 w-full rounded-lg border border-border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                      />
                    </div>
                  )}

                  {/* Campo: Pedido urgente */}
                  {campos.urgente !== "desligado" && (
                    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-1 p-3.5">
                      <div>
                        <span className="text-xs font-medium text-foreground block">
                          Pedido urgente
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          Sinalizar prioridade na fila de produção do laboratório
                        </span>
                      </div>
                      <Switch checked={urgente} onCheckedChange={setUrgente} />
                    </div>
                  )}

                  {/* Seção de Anexos */}
                  <div className="space-y-4 pt-2 border-t border-border">
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Arquivos e Anexos
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Envie os arquivos necessários para o início da produção.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {fileSlots.map((slot) => {
                        const currentFiles = filesBySlot[slot.name] || [];
                        return (
                          <div
                            key={slot.name}
                            className="rounded-xl border border-border bg-surface-1 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-foreground">
                                {slot.name}{" "}
                                {slot.required && <span className="text-error">*</span>}
                              </span>
                              {slot.required && (
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  Obrigatório
                                </span>
                              )}
                            </div>

                            {slotErrors[slot.name] && (
                              <div className="rounded-lg bg-error/10 border border-error/30 p-2 text-xs text-error">
                                {slotErrors[slot.name]}
                              </div>
                            )}

                            {/* Dropzone */}
                            <div
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                const f = e.dataTransfer.files?.[0];
                                if (f) void handleFileSelected(slot.name, f);
                              }}
                              className="rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-surface-2 p-3 text-center transition"
                            >
                              <input
                                type="file"
                                id={`file-input-${slot.name}`}
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void handleFileSelected(slot.name, f);
                                  e.target.value = "";
                                }}
                              />
                              <label
                                htmlFor={`file-input-${slot.name}`}
                                className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                              >
                                <IconUpload size={15} />
                                <span>Escolher arquivo ou arraste aqui</span>
                              </label>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Extensões aceitas: STL, PLY, OBJ, ZIP, JPG, PNG, PDF (Máx{" "}
                                {MAX_FILE_MB}MB)
                              </p>
                            </div>

                            {/* Lista de Arquivos do Slot */}
                            {currentFiles.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                {currentFiles.map((fItem) => (
                                  <div
                                    key={fItem.path || fItem.name}
                                    className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 border border-border p-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <IconFile
                                        size={16}
                                        className="text-muted-foreground shrink-0"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-medium text-foreground truncate">
                                          {fItem.name}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                          <span>{formatFileSize(fItem.size)}</span>
                                          {fItem.uploading && (
                                            <span className="text-primary font-mono font-medium">
                                              {fItem.progress}%
                                            </span>
                                          )}
                                        </div>
                                        {fItem.uploading && (
                                          <div className="w-full bg-border h-1 rounded-full overflow-hidden mt-1">
                                            <div
                                              className="bg-primary h-full transition-all duration-200"
                                              style={{ width: `${fItem.progress}%` }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {!fItem.uploading && (
                                      <button
                                        type="button"
                                        onClick={() => void handleRemoveFile(slot.name, fItem)}
                                        className="text-muted-foreground hover:text-error p-1 rounded transition shrink-0"
                                        title="Remover arquivo"
                                      >
                                        <IconTrash size={14} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <div className="pt-2">
                    <button
                      onClick={submitOrder}
                      disabled={!isReadyToSubmit || creating}
                      className="w-full rounded-lg bg-gradient-brand py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <span>Enviando pedido...</span>
                      ) : (
                        <span>Confirmar e Enviar Pedido</span>
                      )}
                    </button>
                    {!isReadyToSubmit && (
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        Preencha todos os campos obrigatórios e anexe os arquivos solicitados para
                        habilitar o envio.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
          </>
        )}

        {/* Modal de Confirmação do Pedido Enviado */}
        {submittedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-surface-2 border border-border p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success-tint flex items-center justify-center text-success shrink-0">
                  <IconCheck size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Pedido enviado com sucesso!
                  </h3>
                  <p className="text-xs font-mono text-muted-foreground">
                    Código: #{submittedOrder.id.slice(0, 8)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-1 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produto:</span>
                  <span className="font-semibold text-foreground">
                    {submittedOrder.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paciente:</span>
                  <span className="font-medium text-foreground">{submittedOrder.paciente}</span>
                </div>
                {submittedOrder.unidades && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unidades:</span>
                    <span className="font-medium text-foreground">{submittedOrder.unidades}</span>
                  </div>
                )}
                {submittedOrder.dentes && submittedOrder.dentes.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dentes:</span>
                    <span className="font-mono text-foreground">
                      {submittedOrder.dentes.join(", ")}
                    </span>
                  </div>
                )}
                {submittedOrder.cor && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cor:</span>
                    <span className="font-medium text-foreground">{submittedOrder.cor}</span>
                  </div>
                )}
                {submittedOrder.material && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Material:</span>
                    <span className="font-medium text-foreground">{submittedOrder.material}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anexos enviados:</span>
                  <span className="font-medium text-foreground">
                    {submittedOrder.filesCount} arquivo(s)
                  </span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between font-bold text-sm">
                  <span>Total:</span>
                  <span className="text-primary font-mono">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(submittedOrder.valor)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => {
                    const ord = orders.find((o) => o.id === submittedOrder.id);
                    setSubmittedOrder(null);
                    setTab("pedidos");
                    if (ord) void openPayment(ord);
                  }}
                  className="flex-1 rounded-lg bg-gradient-brand py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95"
                >
                  Efetuar Pagamento
                </button>
                <button
                  onClick={() => {
                    setSubmittedOrder(null);
                    setTab("pedidos");
                  }}
                  className="rounded-lg border border-border bg-surface-1 px-4 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  Ver em Meus Pedidos
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aba 3: Meus Pedidos */}
        {tab === "pedidos" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Meus Pedidos</h2>
              <p className="text-xs text-muted-foreground">
                Histórico e acompanhamento de status
              </p>
            </header>

            {pendingClaimsCount > 0 && (
              <div
                data-testid="dentist-claims-pending-banner"
                className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-xs text-foreground flex items-center gap-3"
              >
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                <span>
                  Você tem {pendingClaimsCount} pedido(s) aguardando a confirmação do laboratório. Eles aparecerão aqui quando o laboratório confirmar sua identidade.
                </span>
              </div>
            )}
            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft)]">
              {orders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum pedido realizado neste laboratório.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Data</th>
                        <th className="text-left px-4 py-3 font-medium">Produto</th>
                        <th className="text-left px-4 py-3 font-medium">Paciente</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-right px-4 py-3 font-medium">Valor</th>
                        <th className="text-right px-4 py-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {orders.map((o) => (
                        <tr
                          key={o.id}
                          className={o.status !== "rascunho" ? "cursor-pointer hover:bg-surface-1/60 transition" : ""}
                          onClick={() => {
                            if (o.status !== "rascunho") {
                              setSelectedDetailOrderId(o.id);
                            }
                          }}
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {o.products?.nome ?? "Produto"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {o.paciente ?? "-"}
                          </td>
                          <td className="px-4 py-3">
                            {o.status === "rascunho" ? (
                              <span className="rounded-full bg-warning-tint px-2 py-0.5 text-xs text-warning font-semibold">
                                Rascunho
                              </span>
                            ) : (
                              <span className="rounded-full bg-primary-tint px-2 py-0.5 text-xs text-primary-tint-foreground font-medium">
                                {statusLabels[o.status] ?? o.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(o.valor)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {o.status === "rascunho" ? (
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => void resumeDraft(o)}
                                  className="text-xs text-primary font-semibold hover:underline"
                                >
                                  Continuar
                                </button>
                                <button
                                  onClick={() => void deleteDraft(o.id)}
                                  className="text-xs text-error font-semibold hover:underline"
                                >
                                  Excluir
                                </button>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-end gap-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setSelectedDetailOrderId(o.id)}
                                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-surface-1 transition"
                                >
                                  Detalhes
                                </button>
                                <button
                                  onClick={() => void openPayment(o)}
                                  className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20 transition"
                                >
                                  Pagamento
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba 4: Faturas */}
        {tab === "faturas" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Faturas e Cobranças
              </h2>
              <p className="text-xs text-muted-foreground">
                Derivado dos pedidos realizados em {currentLab?.nome ?? "laboratório"}
              </p>
            </header>
            <div className="rounded-2xl border border-border bg-surface-2 overflow-hidden shadow-[var(--shadow-soft)]">
              {billedOrders.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhuma fatura ou pedido registrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-1 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Data</th>
                        <th className="text-left px-4 py-3 font-medium">Ref. Pedido</th>
                        <th className="text-left px-4 py-3 font-medium">Paciente</th>
                        <th className="text-left px-4 py-3 font-medium">Valor</th>
                        <th className="text-right px-4 py-3 font-medium">Pagamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {billedOrders.map((o) => (
                        <tr key={o.id}>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(o.criado_em).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 font-medium text-foreground">
                            {o.products?.nome ?? "Pedido"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {o.paciente ?? "-"}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(o.valor)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => void openPayment(o)}
                              className="rounded-lg border border-primary px-3 py-1 text-xs font-semibold text-primary hover:bg-primary-tint transition"
                            >
                              Ver Cobrança PIX
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba 5: Academy */}
        {tab === "academy" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Cursos
              </h2>
              <p className="text-xs text-muted-foreground">
                Cursos e capacitação técnica continuada
              </p>
            </header>
            {academyLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando conteúdos…</div>
            ) : academyItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconBook2 size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  Nenhum curso cadastrado no momento.
                </p>
                <p className="text-xs">
                  Novos materiais educativos serão publicados em breve pelo administrador.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {academyItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-tint px-2 py-0.5 rounded">
                        {item.tipo}
                      </span>
                      <h3 className="mt-2 font-semibold text-foreground text-base">
                        {item.titulo}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                        {item.descricao}
                      </p>
                    </div>
                    <a
                      href={item.url_conteudo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 block text-center rounded-lg bg-gradient-brand py-2 text-xs font-semibold text-white"
                    >
                      Acessar Conteúdo →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 6: Tools */}
        {tab === "tools" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Ferramentas e Tutoriais (Tools)
              </h2>
              <p className="text-xs text-muted-foreground">
                Guias práticos e utilitários para seu consultório
              </p>
            </header>
            {academyLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando ferramentas…</div>
            ) : toolsItems.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconTool size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  Nenhuma ferramenta cadastrada no momento.
                </p>
                <p className="text-xs">
                  Tutoriais e ferramentas serão disponibilizados em breve pelo administrador.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolsItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]"
                  >
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{item.titulo}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{item.descricao}</p>
                    </div>
                    <a
                      href={item.url_conteudo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-xs font-semibold text-primary hover:underline"
                    >
                      Ver tutorial →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 7: Benefícios */}
        {tab === "beneficios" && (
          <div className="space-y-6">
            <header>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                Benefícios e Parcerias
              </h2>
              <p className="text-xs text-muted-foreground">
                Vantagens exclusivas para dentistas parceiros LabConect
              </p>
            </header>
            {benefitsLoading ? (
              <div className="p-8 text-sm text-muted-foreground">Carregando benefícios…</div>
            ) : benefits.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface-2 p-12 text-center text-sm text-muted-foreground space-y-2">
                <IconGift size={36} className="mx-auto text-muted-foreground/40" />
                <p className="font-semibold text-foreground">
                  Em breve: descontos e parcerias pra você
                </p>
                <p className="text-xs">
                  Estamos negociando condições especiais com fornecedores de insumos odontológicos.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {benefits.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-2xl border border-border bg-surface-2 p-5 flex flex-col justify-between shadow-[var(--shadow-soft)]"
                  >
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success-tint px-2 py-0.5 rounded">
                        {b.tipo}
                      </span>
                      <h3 className="mt-2 font-semibold text-foreground text-base">{b.titulo}</h3>
                      <p className="text-xs font-medium text-primary mt-0.5">{b.parceiro}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{b.descricao}</p>
                    </div>
                    {b.url_link && (
                      <a
                        href={b.url_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block text-center rounded-lg border border-border py-1.5 text-xs font-semibold text-foreground hover:bg-surface-1"
                      >
                        Resgatar Benefício →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba 8: Meu Perfil */}
        {tab === "meuperfil" && dentist && (
          <DentistMeuPerfilView
            dentist={dentist}
            onProfileUpdated={async (updated) => {
              setDentist(updated);
              await reloadLinks(updated.id);
            }}
            onClaimsUpdated={async () => {
              const resCount = await serverFnContarReivindicacoes();
              setPendingClaimsCount(resCount.count || 0);
            }}
          />
        )}
      </main>

      {/* Modal Pagamento Asaas */}
      {paymentFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-surface-2 border border-border p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground">Pagamento do Pedido</h3>
              <button
                onClick={() => setPaymentFor(null)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-surface-1"
              >
                <IconX size={18} />
              </button>
            </div>

            {paymentLoading && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Gerando cobrança PIX...
              </div>
            )}

            {paymentErr && (
              <div className="rounded-lg bg-error/10 border border-error/30 p-3 text-xs text-error">
                {paymentErr}
              </div>
            )}

            {payment && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs text-muted-foreground">Status do Pagamento</span>
                  <div className="font-bold text-sm text-foreground uppercase tracking-wide">
                    {payment.status}
                  </div>
                </div>

                {payment.pixQrImageBase64 && (
                  <div className="flex justify-center p-2 bg-white rounded-xl">
                    <img
                      src={`data:image/png;base64,${payment.pixQrImageBase64}`}
                      alt="PIX QR Code"
                      className="w-48 h-48"
                    />
                  </div>
                )}

                {payment.pixPayload && (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      Código PIX Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={payment.pixPayload}
                        className="flex-1 rounded-lg border border-border bg-surface-1 px-3 py-1.5 text-xs font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(payment.pixPayload || "");
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                      >
                        {copied ? "Copiado!" : "Copiar"}
                      </button>
                    </div>
                  </div>
                )}

                {payment.invoiceUrl && (
                  <a
                    href={payment.invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center rounded-lg border border-border py-2 text-xs font-semibold text-foreground hover:bg-surface-1"
                  >
                    Abrir fatura →
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => refreshPaymentStatus(paymentFor.id)}
                  className="w-full rounded-lg bg-surface-1 border border-border py-2 text-xs font-medium text-foreground hover:bg-surface-2"
                >
                  Verificar confirmação de pagamento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhe do Pedido (Visão Dentista) */}
      <OrderDetailModal
        orderId={selectedDetailOrderId}
        isOpen={!!selectedDetailOrderId}
        onClose={() => setSelectedDetailOrderId(null)}
        userRole="dentist"
        currentUserId={dentist?.user_id}
        onOrderStatusChanged={(id, newStatus) => {
          setOrders((prev) =>
            prev.map((ord) => (ord.id === id ? { ...ord, status: newStatus } : ord))
          );
        }}
        onOrderUpdated={() => {
          if (dentist && currentLabId) {
            loadOrders(dentist.id, currentLabId);
          }
        }}
      />
    </div>
  );
}

const INPUT_CLASS =
  "mt-1.5 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-primary";

function DentistMeuPerfilView({
  dentist,
  onProfileUpdated,
  onClaimsUpdated,
}: {
  dentist: Dentist;
  onProfileUpdated: (updated: Dentist) => Promise<void> | void;
  onClaimsUpdated?: () => Promise<void> | void;
}) {
  const serverFnRegistrarReivindicacoes = useServerFn(registrarReivindicacoes);
  const [nome, setNome] = useState(dentist.nome ?? "");
  const [cro, setCro] = useState(dentist.cro ?? "");
  const [uf, setUf] = useState(dentist.uf ?? "SP");
  const [telefone, setTelefone] = useState(dentist.telefone ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [linkedNotice, setLinkedNotice] = useState<string | null>(null);

  useEffect(() => {
    setNome(dentist.nome ?? "");
    setCro(dentist.cro ?? "");
    setUf(dentist.uf ?? "SP");
    setTelefone(dentist.telefone ?? "");
  }, [dentist]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccessMessage(null);
    setLinkedNotice(null);

    const croClean = cro.trim();
    if (!nome.trim()) {
      setErr("O nome completo não pode ficar vazio.");
      return;
    }
    if (!croClean) {
      setErr("O CRO não pode ficar vazio.");
      return;
    }
    if (!UFS.includes(uf)) {
      setErr("Selecione uma sigla de estado (UF) válida.");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("dentists")
        .update({
          nome: nome.trim(),
          cro: croClean.toUpperCase(),
          uf: uf.toUpperCase(),
          telefone: telefone.trim() || null,
        })
        .eq("id", dentist.id);

      if (error) {
        setErr(error.message);
        return;
      }

      const updatedDentist: Dentist = {
        ...dentist,
        nome: nome.trim(),
        cro: croClean.toUpperCase(),
        uf: uf.toUpperCase(),
        telefone: telefone.trim() || null,
      };

      await onProfileUpdated(updatedDentist);
      setSuccessMessage("Perfil atualizado com sucesso!");

      try {
        const claimRes = await serverFnRegistrarReivindicacoes();
        if (onClaimsUpdated) {
          await onClaimsUpdated();
        }
        if (claimRes && claimRes.claimedCount > 0) {
          setLinkedNotice(
            `Encontramos ${claimRes.claimedCount} pedido(s) correspondente(s) ao seu CRO/UF. Eles foram encaminhados para confirmação do laboratório.`
          );
        }
      } catch (claimErr) {
        console.error("Erro ao registrar reivindicações:", claimErr);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Meu perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie suas informações profissionais. Mantenha seu CRO e UF atualizados para vincular
          automaticamente pedidos dos laboratórios.
        </p>
      </header>

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-surface-2 border border-border shadow-[var(--shadow-soft)] p-6 space-y-5"
      >
        {err && (
          <div className="rounded-lg bg-error/10 border border-error/30 p-3 text-xs text-error">
            {err}
          </div>
        )}

        {successMessage && (
          <div className="rounded-lg bg-success-tint border border-success/30 p-3 text-xs text-success font-medium flex items-center gap-2">
            <IconCheck size={16} /> {successMessage}
          </div>
        )}

        {linkedNotice && (
          <div className="rounded-lg bg-primary-tint border border-primary/30 p-4 text-xs text-primary-tint-foreground font-semibold space-y-1">
            <p className="text-sm font-bold">{linkedNotice}</p>
            <p className="text-[11px] opacity-90 font-normal">
              Acesse a aba <strong>Meus Pedidos</strong> para visualizar seus serviços atualizados!
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome completo</label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              E-mail (Login: Somente leitura)
            </label>
            <input
              type="email"
              value={dentist.email}
              readOnly
              disabled
              className={`${INPUT_CLASS} opacity-70 bg-surface-1 cursor-not-allowed`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                CRO (Número do Registro)
              </label>
              <input
                value={cro}
                onChange={(e) => setCro(e.target.value)}
                placeholder="Ex: 999999"
                required
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">UF (Estado)</label>
              <select
                value={uf}
                onChange={(e) => setUf(e.target.value)}
                className={INPUT_CLASS}
              >
                {UFS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Telefone de Contato</label>
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(11) 99999-9999"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-brand px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-60"
          >
            {saving ? "Salvar alterações..." : "Salvar Perfil"}
          </button>
        </div>
      </form>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
        active
          ? "bg-white text-black shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
