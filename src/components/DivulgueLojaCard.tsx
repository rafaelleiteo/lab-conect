import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  IconCopy,
  IconCheck,
  IconBrandWhatsapp,
  IconQrcode,
  IconShare,
  IconChevronRight,
  IconAlertCircle,
  IconInfoCircle,
  IconRefresh,
  IconDeviceFloppy,
  IconDownload,
  IconX,
} from "@tabler/icons-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CUSTOM_DOMAIN_ACTIVE,
  getLabPublicUrl,
  type StoreVisitOrigin,
} from "@/lib/domain-context";
import type { LabRow } from "@/hooks/useCurrentLab";

export const DEFAULT_MENSAGEM_DIVULGACAO =
  "Olá, Dr(a)! Agora você pode fazer seus pedidos de {nome} online, acompanhar o status e consultar a tabela de preços em um só lugar: {link}";

interface DivulgueLojaCardProps {
  lab: LabRow | null;
  variant?: "compact" | "full";
  onOpenFullSettings?: () => void;
}

export function DivulgueLojaCard({
  lab,
  variant = "full",
  onOpenFullSettings,
}: DivulgueLojaCardProps) {
  if (!lab) {
    return (
      <div className="rounded-[10px] bg-surface-2 border border-[#D7DAE5] p-6 animate-pulse space-y-3">
        <div className="h-4 w-40 bg-surface-1 rounded" />
        <div className="h-3 w-64 bg-surface-1 rounded" />
      </div>
    );
  }

  const subdominio = lab.subdominio || "";
  const labNome = lab.nome || "Meu Laboratório";
  const brandColor = lab.cor_destaque || "#4C5FF5";

  // Estados de link e cópia
  const linkCopiar = getLabPublicUrl(subdominio, "link");
  const [copied, setCopied] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);

  // Estados da mensagem
  const [mensagem, setMensagem] = useState<string>(() => {
    return lab?.mensagem_divulgacao || DEFAULT_MENSAGEM_DIVULGACAO;
  });
  const [salvandoMensagem, setSalvandoMensagem] = useState(false);
  const [mensagemSalvaAviso, setMensagemSalvaAviso] = useState<string | null>(null);

  // Sincroniza mensagem caso o lab mude no hook
  useEffect(() => {
    if (lab) {
      setMensagem(lab.mensagem_divulgacao || DEFAULT_MENSAGEM_DIVULGACAO);
    }
  }, [lab?.mensagem_divulgacao]);

  // Checagem de produtos ativos
  const [hasActiveProducts, setHasActiveProducts] = useState(true);
  useEffect(() => {
    if (!lab?.id) return;
    let mounted = true;
    (async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("lab_id", lab.id)
        .eq("ativo", true);
      if (mounted && !error) {
        setHasActiveProducts((count ?? 0) > 0);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [lab?.id]);

  // Modal QR Code
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState<string | null>(null);
  const qrLink = getLabPublicUrl(subdominio, "qr");

  useEffect(() => {
    if (!qrModalOpen || !subdominio) return;
    let mounted = true;
    QRCode.toDataURL(qrLink, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (mounted) setQrPreviewDataUrl(url);
      })
      .catch((err) => console.error("Erro ao gerar preview de QR:", err));
    return () => {
      mounted = false;
    };
  }, [qrModalOpen, qrLink, subdominio]);

  async function handleBaixarQrCode() {
    if (!subdominio) return;
    try {
      const dataUrl = await QRCode.toDataURL(qrLink, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `qr-${subdominio}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Erro ao baixar QR code:", err);
    }
  }

  // Suporte a Web Share API
  const [hasShareApi, setHasShareApi] = useState(false);
  useEffect(() => {
    setHasShareApi(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  // Formata o texto final com {nome} e {link}
  function formatarTextoFinal(origem: StoreVisitOrigin | string): string {
    const rawTemplate = (mensagem.trim() || DEFAULT_MENSAGEM_DIVULGACAO);
    const linkCanal = getLabPublicUrl(subdominio, origem);

    let textWithLink = rawTemplate;
    if (textWithLink.includes("{link}")) {
      textWithLink = textWithLink.replaceAll("{link}", linkCanal);
    } else {
      textWithLink = `${textWithLink}\n\n${linkCanal}`;
    }

    return textWithLink.replaceAll("{nome}", labNome);
  }

  // Ações de compartilhamento
  async function handleCopiarLink() {
    try {
      await navigator.clipboard.writeText(linkCopiar);
      setCopied(true);
      setCopyFeedback("Link copiado!");
      setTimeout(() => {
        setCopied(false);
        setCopyFeedback(null);
      }, 2000);
    } catch {
      if (linkInputRef.current) {
        linkInputRef.current.select();
      }
      setCopyFeedback("Pressione Ctrl+C para copiar");
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  }

  function handleCompartilharWhatsApp() {
    const texto = formatarTextoFinal("whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleWebShare() {
    if (!hasShareApi) return;
    const texto = formatarTextoFinal("compartilhar");
    const linkCanal = getLabPublicUrl(subdominio, "compartilhar");
    try {
      await navigator.share({
        title: `Loja de ${labNome}`,
        text: texto,
        url: linkCanal,
      });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Erro ao compartilhar via Web Share:", err);
      }
    }
  }

  async function handleSalvarMensagem() {
    if (!lab?.id) return;
    setSalvandoMensagem(true);
    setMensagemSalvaAviso(null);
    const finalVal = mensagem.trim() === DEFAULT_MENSAGEM_DIVULGACAO ? null : mensagem.trim();
    const { error } = await supabase
      .from("labs")
      .update({ mensagem_divulgacao: finalVal })
      .eq("id", lab.id);
    setSalvandoMensagem(false);
    if (!error) {
      setMensagemSalvaAviso("Mensagem salva com sucesso!");
      setTimeout(() => setMensagemSalvaAviso(null), 3000);
    } else {
      setMensagemSalvaAviso("Erro ao salvar mensagem.");
    }
  }

  async function handleRestaurarPadrao() {
    if (!lab?.id) return;
    setSalvandoMensagem(true);
    setMensagemSalvaAviso(null);
    const { error } = await supabase
      .from("labs")
      .update({ mensagem_divulgacao: null })
      .eq("id", lab.id);
    setSalvandoMensagem(false);
    if (!error) {
      setMensagem(DEFAULT_MENSAGEM_DIVULGACAO);
      setMensagemSalvaAviso("Padrão restaurado!");
      setTimeout(() => setMensagemSalvaAviso(null), 3000);
    }
  }

  // Tabela de visitas (7 ou 30 dias)
  const [diasFiltro, setDiasFiltro] = useState<7 | 30>(7);
  const [visitas, setVisitas] = useState<Record<string, number>>({});
  const [carregandoVisitas, setCarregandoVisitas] = useState(false);

  useEffect(() => {
    if (variant === "compact" || !lab?.id) return;
    let mounted = true;
    (async () => {
      setCarregandoVisitas(true);
      const dataInicio = new Date(Date.now() - diasFiltro * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from("store_visit_counts")
        .select("origem, total")
        .eq("lab_id", lab.id)
        .gte("dia", dataInicio);

      if (!mounted) return;
      setCarregandoVisitas(false);

      if (!error && data) {
        const counts: Record<string, number> = {};
        for (const row of data) {
          counts[row.origem] = (counts[row.origem] || 0) + (row.total || 0);
        }
        setVisitas(counts);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [variant, lab?.id, diasFiltro]);

  const totalVisitas = Object.values(visitas).reduce((a, b) => a + b, 0);

  // ---------------------------------------------------------------------------
  // RENDERIZAÇÃO: Versão Compacta (para o Painel)
  // ---------------------------------------------------------------------------
  if (variant === "compact") {
    return (
      <section
        className="rounded-[10px] bg-surface-2 border border-[#D7DAE5] p-5 shadow-[var(--shadow-soft)] space-y-4"
        style={{ borderColor: "#D7DAE5" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">Divulgue sua loja</h2>
            <p className="text-[12.5px] text-muted-foreground mt-0.5">
              Compartilhe o link com seus dentistas para receber pedidos diretamente.
            </p>
          </div>
          {onOpenFullSettings && (
            <button
              onClick={onOpenFullSettings}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold hover:underline self-start sm:self-auto"
              style={{ color: brandColor }}
            >
              <span>Mais opções</span>
              <IconChevronRight size={15} />
            </button>
          )}
        </div>

        {/* Link e botões compactos */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1 min-w-0">
            <input
              ref={linkInputRef}
              type="text"
              readOnly
              value={linkCopiar}
              className="w-full rounded-[8px] border border-[#D7DAE5] bg-surface-1 px-3 py-2 text-xs font-mono text-foreground outline-none select-all"
            />
          </div>

          <button
            onClick={handleCopiarLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DAE5] bg-surface-1 hover:bg-surface-2 px-3.5 py-2 text-xs font-semibold text-foreground transition"
          >
            {copied ? <IconCheck size={15} className="text-success" /> : <IconCopy size={15} />}
            <span>{copied ? "Link copiado" : "Copiar link"}</span>
          </button>

          <button
            onClick={handleCompartilharWhatsApp}
            className="inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3.5 py-2 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
            style={{ backgroundColor: "#25D366" }}
          >
            <IconBrandWhatsapp size={16} />
            <span>Compartilhar no WhatsApp</span>
          </button>
        </div>

        {copyFeedback && (
          <p className="text-[12px] font-medium text-primary mt-1">{copyFeedback}</p>
        )}
      </section>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDERIZAÇÃO: Versão Completa (para My LabConect)
  // ---------------------------------------------------------------------------
  return (
    <div
      className="rounded-[10px] bg-surface-2 border border-[#D7DAE5] p-6 shadow-[var(--shadow-soft)] space-y-6"
      style={{ borderColor: "#D7DAE5" }}
    >
      {/* 1. Cabeçalho */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Divulgue sua loja
        </h2>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Compartilhe o link com seus dentistas. Eles pedem, enviam arquivos e acompanham tudo em um só lugar.
        </p>
      </div>

      {/* 2. Avisos contextuais */}
      {!CUSTOM_DOMAIN_ACTIVE && (
        <div className="flex items-start gap-2.5 rounded-[8px] bg-surface-1 border border-[#D7DAE5] p-3 text-[12px] text-muted-foreground">
          <IconInfoCircle size={16} className="text-primary shrink-0 mt-0.5" />
          <span>
            Este é o link de testes. Quando o domínio definitivo estiver ativo, o link muda e os QR Codes impressos com este endereço devem ser refeitos. Evite imprimir material agora.
          </span>
        </div>
      )}

      {!hasActiveProducts && (
        <div className="flex items-start gap-2.5 rounded-[8px] bg-warning-tint border border-warning/30 p-3 text-[12px] text-warning">
          <IconAlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            Sua loja ainda não tem produtos ativos. Cadastre ao menos um antes de divulgar.
          </span>
        </div>
      )}

      {/* 3. Campo de link com botão Copiar */}
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-medium text-muted-foreground">
          Link da sua loja
        </label>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <input
            ref={linkInputRef}
            type="text"
            readOnly
            value={linkCopiar}
            className="flex-1 rounded-[8px] border border-[#D7DAE5] bg-surface-1 px-3 py-2 text-xs font-mono text-foreground outline-none select-all"
          />
          <button
            onClick={handleCopiarLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DAE5] bg-surface-1 hover:bg-surface-2 px-4 py-2 text-xs font-semibold text-foreground transition"
          >
            {copied ? <IconCheck size={15} className="text-success" /> : <IconCopy size={15} />}
            <span>{copied ? "Link copiado" : "Copiar link"}</span>
          </button>
        </div>
        {copyFeedback && (
          <p className="text-[12px] font-medium text-primary mt-1">{copyFeedback}</p>
        )}
      </div>

      {/* 4. Botões de Ação */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <button
          onClick={handleCompartilharWhatsApp}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
          style={{ backgroundColor: "#25D366" }}
        >
          <IconBrandWhatsapp size={16} />
          <span>Compartilhar no WhatsApp</span>
        </button>

        <button
          onClick={() => setQrModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#D7DAE5] bg-surface-1 hover:bg-surface-2 px-4 py-2.5 text-xs font-semibold text-foreground transition"
        >
          <IconQrcode size={16} />
          <span>Baixar QR Code</span>
        </button>

        {hasShareApi && (
          <button
            onClick={handleWebShare}
            className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#D7DAE5] bg-surface-1 hover:bg-surface-2 px-4 py-2.5 text-xs font-semibold text-foreground transition"
          >
            <IconShare size={16} />
            <span>Compartilhar</span>
          </button>
        )}
      </div>

      {/* 5. Mensagem Editável */}
      <div className="space-y-3 pt-2 border-t border-[#D7DAE5]">
        <div className="flex items-center justify-between">
          <label className="text-[12.5px] font-medium text-muted-foreground">
            Mensagem personalizada
          </label>
          <span className="text-[11px] text-muted-foreground font-mono">
            {mensagem.length}/500
          </span>
        </div>

        <textarea
          rows={3}
          maxLength={500}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder={DEFAULT_MENSAGEM_DIVULGACAO}
          className="w-full rounded-[8px] border border-[#D7DAE5] bg-surface-1 p-3 text-xs text-foreground outline-none focus:border-primary resize-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSalvarMensagem}
              disabled={salvandoMensagem}
              className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 disabled:opacity-50 transition"
              style={{ backgroundColor: brandColor }}
            >
              <IconDeviceFloppy size={14} />
              <span>{salvandoMensagem ? "Salvando…" : "Salvar mensagem"}</span>
            </button>
            <button
              onClick={handleRestaurarPadrao}
              disabled={salvandoMensagem}
              className="inline-flex items-center gap-1.5 rounded-[8px] border border-[#D7DAE5] bg-surface-1 hover:bg-surface-2 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              <IconRefresh size={14} />
              <span>Restaurar padrão</span>
            </button>
          </div>
          {mensagemSalvaAviso && (
            <span className="text-[12px] font-medium text-success animate-fade-in">
              {mensagemSalvaAviso}
            </span>
          )}
        </div>

        {/* Prévia do texto final */}
        <div className="mt-3 rounded-[8px] bg-surface-1 border border-[#D7DAE5] p-3 text-xs text-muted-foreground space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
            Prévia do texto enviado:
          </span>
          <p className="text-foreground whitespace-pre-wrap font-sans text-xs">
            {formatarTextoFinal("whatsapp")}
          </p>
        </div>
      </div>

      {/* 6. Visitas por canal */}
      <div className="space-y-3 pt-2 border-t border-[#D7DAE5]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground">Visitas à sua loja</h3>
            <p className="text-[12px] text-muted-foreground">
              Acompanhe quantas pessoas acessaram sua vitrine por canal.
            </p>
          </div>
          <div className="inline-flex rounded-[8px] border border-[#D7DAE5] bg-surface-1 p-0.5 self-start sm:self-auto">
            <button
              onClick={() => setDiasFiltro(7)}
              className={`px-3 py-1 text-xs font-medium rounded-[6px] transition ${
                diasFiltro === 7 ? "bg-surface-2 text-foreground shadow-xs font-semibold" : "text-muted-foreground"
              }`}
            >
              7 dias
            </button>
            <button
              onClick={() => setDiasFiltro(30)}
              className={`px-3 py-1 text-xs font-medium rounded-[6px] transition ${
                diasFiltro === 30 ? "bg-surface-2 text-foreground shadow-xs font-semibold" : "text-muted-foreground"
              }`}
            >
              30 dias
            </button>
          </div>
        </div>

        {carregandoVisitas ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Carregando visitas…
          </div>
        ) : totalVisitas === 0 ? (
          <div className="rounded-[8px] bg-surface-1 border border-[#D7DAE5] p-6 text-center text-xs text-muted-foreground">
            Ainda sem visitas. Compartilhe o link para começar a medir.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[8px] border border-[#D7DAE5]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-1 border-b border-[#D7DAE5] text-muted-foreground font-semibold">
                  <th className="px-4 py-2.5">Canal</th>
                  <th className="px-4 py-2.5 text-right">Visitas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D7DAE5]">
                <tr>
                  <td className="px-4 py-2 text-foreground">WhatsApp</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["whatsapp"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">E-mail</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["email"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">QR Code</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["qr"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Link copiado</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["link"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Compartilhar do celular</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["compartilhar"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Acesso direto</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["direto"] || 0}</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-foreground">Outros</td>
                  <td className="px-4 py-2 text-right font-mono font-medium text-foreground">{visitas["outro"] || 0}</td>
                </tr>
                <tr className="bg-surface-1 font-bold">
                  <td className="px-4 py-2.5 text-foreground">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono text-foreground">{totalVisitas}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Conta uma visita por navegador e sessão. Não guarda nome, IP nem dados pessoais. Suas visitas pelos botões 'Ver minha loja' não entram na conta.
        </p>
      </div>

      {/* Modal / Janela QR Code */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[10px] bg-surface-2 border border-[#D7DAE5] p-6 shadow-xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">QR Code da Loja</h3>
              <button
                onClick={() => setQrModalOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
                aria-label="Fechar QR Code"
              >
                <IconX size={18} />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-[#D7DAE5]">
              {qrPreviewDataUrl ? (
                <img
                  src={qrPreviewDataUrl}
                  alt={`QR Code de ${labNome}`}
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-xs text-muted-foreground">
                  Gerando QR Code…
                </div>
              )}
            </div>

            <p className="text-[12px] text-center text-muted-foreground font-mono truncate">
              {qrLink}
            </p>

            <button
              onClick={handleBaixarQrCode}
              className="w-full inline-flex items-center justify-center gap-2 rounded-[8px] py-2.5 text-xs font-semibold text-white shadow-[var(--shadow-soft)] hover:opacity-95 transition"
              style={{ backgroundColor: brandColor }}
            >
              <IconDownload size={16} />
              <span>Baixar PNG (1024×1024)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
