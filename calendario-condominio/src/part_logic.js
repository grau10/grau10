/* ---------- catálogo: plano-modelo baseado em manuais típicos de áreas comuns ---------- */
const PER = {
  unica:{l:"Única (não repete)"}, semanal:{l:"Semanal",d:7}, quinzenal:{l:"Quinzenal",d:14},
  mensal:{l:"Mensal",m:1}, bimestral:{l:"Bimestral",m:2}, trimestral:{l:"Trimestral",m:3},
  semestral:{l:"Semestral",m:6}, anual:{l:"Anual",m:12}, bienal:{l:"A cada 2 anos",m:24},
  trienal:{l:"A cada 3 anos",m:36}, quinquenal:{l:"A cada 5 anos",m:60}
};
const CAT = {preventiva:"Manutenção programada", corretiva:"Reparo", outras:"Vistorias e obrigações"};
const CAT_DESC = {
  preventiva:"Cuidados de rotina com data marcada no manual do edifício, feitos para evitar defeitos (antes chamada de manutenção preventiva).",
  corretiva:"Conserto de algo que já apresentou defeito ou dano (antes chamada de manutenção corretiva).",
  outras:"Vistorias, laudos, certificados e exigências legais, como Corpo de Bombeiros e vigilância sanitária."
};
const SISTEMAS = ["Reservatórios e água potável","Instalações hidrossanitárias","Combate a incêndio","SPDA (para-raios)","Elevadores","Bombas e motores","Gerador","Portões e acessos","Cobertura e impermeabilização","Fachada e revestimentos","Instalações elétricas","Lazer e playground","Piscina","Jardins e áreas externas","Estrutura","Esquadrias e vidros","Pisos e garagem","Gestão do condomínio"];

const TEMPLATE = [
 {k:"res-limpeza",s:"Reservatórios e água potável",t:"Limpeza e desinfecção dos reservatórios",c:"preventiva",p:"semestral",r:"Empresa especializada",ref:"NBR 5674 · NBR 5626 · Portaria GM/MS 888/2021",
  como:"Fechar o registro de entrada e esvaziar o reservatório.\nEscovar paredes e fundo sem produtos abrasivos.\nDesinfetar com solução clorada, aguardar o tempo de contato e enxaguar.\nConferir tampas, extravasor e telas.\nSolicitar o laudo de potabilidade e o certificado do serviço.",
  pq:"Água de reservatório sem limpeza acumula sedimentos e microrganismos que chegam a todas as unidades. A limpeza semestral é exigência sanitária e item obrigatório do manual."},
 {k:"ext-insp",s:"Combate a incêndio",t:"Inspeção visual dos extintores",c:"preventiva",p:"mensal",r:"Zelador / equipe local",ref:"NBR 12962",
  como:"Verificar lacre, pino e manômetro na faixa verde.\nConferir data de validade da carga e do teste hidrostático.\nConfirmar sinalização e acesso desobstruído.\nRegistrar extintores com problema.",
  pq:"Um extintor despressurizado ou bloqueado falha na emergência. A inspeção mensal também sustenta a regularidade junto ao Corpo de Bombeiros."},
 {k:"ext-recarga",s:"Combate a incêndio",t:"Recarga e manutenção dos extintores",c:"preventiva",p:"anual",r:"Empresa certificada INMETRO",ref:"NBR 12962",
  como:"Enviar à empresa certificada, com substituição temporária.\nConferir selo INMETRO e etiqueta com a próxima data.\nGuardar as notas e certificados.",
  pq:"O agente extintor perde eficácia com o tempo. A recarga anual é exigida para manter o certificado do Corpo de Bombeiros e a cobertura do seguro."},
 {k:"mang",s:"Combate a incêndio",t:"Inspeção e ensaio hidrostático das mangueiras",c:"preventiva",p:"anual",r:"Empresa especializada",ref:"NBR 12779",
  como:"Desenrolar e inspecionar as mangueiras, uniões e esguichos.\nRealizar o ensaio hidrostático.\nAcondicionar corretamente nos abrigos.",
  pq:"Mangueiras ressecadas ou com uniões danificadas rompem sob pressão no momento do uso."},
 {k:"ilum",s:"Combate a incêndio",t:"Teste da iluminação de emergência",c:"preventiva",p:"mensal",r:"Zelador / equipe local",ref:"NBR 10898",
  como:"Desligar o circuito correspondente.\nConferir se todas as luminárias acendem.\nVerificar a autonomia mínima indicada no manual.\nSubstituir baterias e lâmpadas com falha.",
  pq:"Sem iluminação de emergência, a evacuação de escadas e garagens fica comprometida em uma queda de energia ou incêndio."},
 {k:"avcb",s:"Gestão do condomínio",t:"Renovação do certificado do Corpo de Bombeiros",c:"outras",p:"anual",r:"Síndico",ref:"Legislação estadual de prevenção contra incêndio",
  como:"Conferir a validade do certificado atual.\nReunir laudos e notas de extintores, mangueiras, iluminação e SPDA.\nProtocolar a vistoria com antecedência.",
  pq:"Sem o certificado em dia o condomínio fica irregular, sujeito a multa e com risco na cobertura do seguro."},
 {k:"spda",s:"SPDA (para-raios)",t:"Inspeção e medição do SPDA",c:"preventiva",p:"anual",r:"Engenheiro eletricista / empresa especializada",ref:"NBR 5419",
  como:"Inspecionar captores, descidas e conexões.\nMedir continuidade e resistência de aterramento.\nEmitir laudo com ART.",
  pq:"Conexões corroídas tornam o para-raios ineficaz e expõem a edificação e os equipamentos a descargas atmosféricas."},
 {k:"elev",s:"Elevadores",t:"Manutenção mensal dos elevadores",c:"preventiva",p:"mensal",r:"Empresa conservadora habilitada",ref:"NBR 16083 · contrato de conservação",
  como:"Acompanhar a visita mensal da conservadora.\nConferir o relatório da visita e itens pendentes.\nVerificar o funcionamento do alarme e do interfone da cabina.",
  pq:"A manutenção mensal por empresa habilitada é obrigatória e evita paradas, aprisionamentos e acidentes."},
 {k:"bombas",s:"Bombas e motores",t:"Verificação e alternância das bombas de recalque",c:"preventiva",p:"mensal",r:"Zelador / equipe local",ref:"NBR 5674 · manual do fabricante",
  como:"Verificar ruídos, vibração e vazamentos no selo.\nAlternar a bomba principal e a reserva.\nTestar o acionamento automático pelas boias.",
  pq:"Bomba parada por muito tempo trava; bomba sobrecarregada queima. Alternar mantém as duas prontas e evita falta de água."},
 {k:"gerador",s:"Gerador",t:"Teste do gerador em carga",c:"preventiva",p:"mensal",r:"Zelador / empresa especializada",ref:"Manual do fabricante",
  como:"Simular falta de energia e verificar a partida automática.\nConferir combustível, óleo, bateria e água do radiador.\nRegistrar horas de funcionamento.",
  pq:"O gerador alimenta elevadores, bombas e iluminação de emergência. Sem teste periódico, ele pode falhar justamente quando faltar energia."},
 {k:"portao",s:"Portões e acessos",t:"Lubrificação e regulagem dos portões automáticos",c:"preventiva",p:"trimestral",r:"Empresa especializada",ref:"Manual do fabricante",
  como:"Lubrificar trilhos, roldanas e cremalheira.\nRegular fins de curso e sensores antiesmagamento.\nVerificar fixações e o motor.",
  pq:"Portões desregulados travam, forçam o motor e podem atingir pessoas ou veículos se o sensor falhar."},
 {k:"cobertura",s:"Cobertura e impermeabilização",t:"Inspeção da impermeabilização, rufos e juntas",c:"preventiva",p:"anual",r:"Empresa especializada / engenheiro",ref:"NBR 9575 · NBR 5674",
  como:"Inspecionar mantas, proteção mecânica, rufos e juntas de dilatação.\nVerificar ralos e caimentos.\nRegistrar fissuras e pontos de empoçamento com fotos.",
  pq:"Infiltração é a manifestação patológica mais comum em condomínios. Detectar cedo evita danos à estrutura e reparos muito mais caros."},
 {k:"calhas",s:"Cobertura e impermeabilização",t:"Limpeza de calhas, ralos e condutores pluviais",c:"preventiva",p:"trimestral",r:"Zelador / equipe local",ref:"NBR 10844 · NBR 5674",
  como:"Retirar folhas e detritos de calhas e ralos.\nTestar o escoamento com água.\nVerificar fixações e emendas.",
  pq:"Calha entupida transborda para dentro de lajes e paredes. Fazer antes do período de chuvas evita infiltrações."},
 {k:"gordura",s:"Instalações hidrossanitárias",t:"Limpeza das caixas de gordura e de inspeção",c:"preventiva",p:"trimestral",r:"Empresa especializada",ref:"NBR 8160 · NBR 5674",
  como:"Remover a gordura e os resíduos acumulados.\nVerificar tampas e vedação.\nDestinar os resíduos corretamente.",
  pq:"Caixas saturadas causam entupimentos, refluxo de esgoto e mau cheiro nas áreas comuns."},
 {k:"fachada",s:"Fachada e revestimentos",t:"Inspeção do revestimento e dos selantes da fachada",c:"preventiva",p:"anual",r:"Engenheiro / empresa especializada",ref:"NBR 13755 · NBR 5674",
  como:"Inspecionar placas cerâmicas, rejuntes e juntas de movimentação.\nRealizar teste de percussão nas áreas suspeitas.\nRegistrar fissuras e descolamentos com fotos.",
  pq:"Placas que se soltam da fachada representam risco à vida de quem circula embaixo e indicam infiltração no sistema."},
 {k:"eletrica",s:"Instalações elétricas",t:"Reaperto e termografia dos quadros elétricos",c:"preventiva",p:"anual",r:"Eletricista habilitado",ref:"NBR 5410 · NR-10",
  como:"Desenergizar com procedimento seguro.\nReapertar conexões dos quadros gerais e de distribuição.\nRealizar termografia para identificar pontos quentes.\nTestar disjuntores e DR.",
  pq:"Conexões frouxas aquecem e são causa frequente de incêndio de origem elétrica."},
 {k:"play",s:"Lazer e playground",t:"Inspeção de segurança do playground",c:"preventiva",p:"mensal",r:"Zelador / equipe local",ref:"NBR 16071",
  como:"Verificar fixações, parafusos expostos, correntes e assentos.\nConferir piso de amortecimento.\nInterditar brinquedos danificados.",
  pq:"Brinquedos com peças soltas ou cantos expostos causam acidentes com crianças."},
 {k:"piscina",s:"Piscina",t:"Tratamento e análise da água da piscina",c:"preventiva",p:"semanal",r:"Piscineiro",ref:"Normas sanitárias locais",
  como:"Medir pH e cloro.\nAspirar, escovar e limpar o filtro.\nRegistrar os parâmetros medidos.",
  pq:"Água fora dos parâmetros causa irritações e doenças de pele e pode levar à interdição da piscina."},
 {k:"jardim",s:"Jardins e áreas externas",t:"Poda, adubação e verificação da irrigação",c:"preventiva",p:"trimestral",r:"Jardineiro",ref:"Manual do proprietário",
  como:"Podar árvores e arbustos próximos a fachadas e calhas.\nAdubar e repor forração.\nVerificar a irrigação e a drenagem dos canteiros.",
  pq:"Raízes e galhos sem controle danificam pisos, impermeabilização e calhas."},
 {k:"dedet",s:"Gestão do condomínio",t:"Dedetização e desratização das áreas comuns",c:"outras",p:"semestral",r:"Empresa licenciada",ref:"Vigilância sanitária",
  como:"Agendar com empresa licenciada e avisar os moradores.\nTratar garagens, casa de lixo, poços e shafts.\nGuardar o certificado com os produtos aplicados.",
  pq:"O controle de pragas é exigência sanitária e evita contaminação nas áreas de lixo e de convivência."},
 {k:"plano",s:"Gestão do condomínio",t:"Revisão do plano de manutenção",c:"outras",p:"anual",r:"Síndico",ref:"NBR 5674",
  como:"Comparar o que foi previsto com o que foi realizado.\nAtualizar prazos, custos e fornecedores.\nApresentar o plano revisado na assembleia.",
  pq:"A NBR 5674 exige que o programa de manutenção seja revisado e documentado. Isso orienta a previsão orçamentária do ano seguinte."},
 {k:"inspecao",s:"Gestão do condomínio",t:"Inspeção predial com laudo técnico",c:"outras",p:"quinquenal",r:"Engenheiro civil / arquiteto",ref:"NBR 16747",
  como:"Contratar profissional habilitado com ART/RRT.\nDisponibilizar manuais, projetos e registros de manutenção.\nPriorizar as recomendações do laudo no plano.",
  pq:"O laudo de inspeção predial classifica as anomalias por grau de risco e indica as correções antes que virem problemas graves."}
];

/* ---------- utilitários ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2,"0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s||""); return m ? new Date(+m[1], +m[2]-1, +m[3], 12) : null; };
const addDays = (d,n) => { const t = new Date(d); t.setDate(t.getDate()+n); return t; };
const addMonths = (d,n) => { const y=d.getFullYear(), m=d.getMonth()+n, last=new Date(y,m+1,0).getDate(); return new Date(y,m,Math.min(d.getDate(),last),12); };
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DIAS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const fmtD = s => { const d = parse(s); return d ? `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}` : "—"; };
const fmtDShort = s => { const d = parse(s); return d ? `${DIAS[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth()+1)}` : ""; };
const brl = v => (typeof v === "number" && isFinite(v)) ? v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "";
const todayD = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12); };
const lsGet = k => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k,v) => { try { localStorage.setItem(k,v); } catch {} };

/* ---------- estado ---------- */
const S = {
  db:null, user:null, me:null, myId:null, isOwner:false, canWrite:null, writeRefused:false,
  atividades:new Map(), registros:[], equipe:[], nome:"", loaded:{a:false,r:false},
  cursor: (() => { const t = todayD(); return new Date(t.getFullYear(), t.getMonth(), 1, 12); })(),
  sel: ymd(todayD()), view: lsGet("cal.view") === "agenda" ? "agenda" : "mes",
  cats: new Set(["preventiva","corretiva","outras"]), open:null, names:{},
  tab: ["calendario","visao","edificio"].includes(lsGet("cal.tab")) ? lsGet("cal.tab") : "calendario", ed:{}, assets:null, delDoc:null, envios:[], downloads:null, ultimoBackup:null, ordens:[]
};
const podeEditar = () => !!S.db && !S.writeRefused && S.canWrite !== false && (S.isOwner || (S.myId && S.equipe.includes(S.myId)));

function occurrences(a, from, to){
  const s = parse(a.data); if (!s) return [];
  const p = PER[a.periodicidade] || PER.unica, out = [];
  if (p.d){
    let t = new Date(s);
    if (t < from){ const n = Math.floor(Math.round((from - t)/864e5) / p.d); t = addDays(t, n*p.d); }
    while (t <= to){ if (t >= from) out.push(ymd(t)); t = addDays(t, p.d); }
  } else if (p.m){
    for (let k = 0; k < 3000; k++){ const t = addMonths(s, k*p.m); if (t > to) break; if (t >= from) out.push(ymd(t)); }
  } else if (s >= from && s <= to) out.push(ymd(s));
  return out;
}
function regsFor(id, oc){ return S.registros.filter(r => r.atividadeId === id && (!oc || r.ocorrencia === oc)); }
function done(id, oc){ return S.registros.some(r => r.atividadeId === id && r.ocorrencia === oc && r.concluida); }
function status(id, oc){
  if (done(id, oc)) return "done";
  const t = ymd(todayD());
  return oc < t ? "late" : oc === t ? "today" : "next";
}
const STATUS_L = {done:"Concluída", late:"Atrasada", today:"Hoje", next:"Prevista"};

function eventsBetween(from, to, ignoreFilter){
  const out = [];
  for (const a of S.atividades.values()){
    if (!ignoreFilter && !S.cats.has(a.categoria)) continue;
    for (const oc of occurrences(a, from, to)) out.push({a, oc, st: status(a.id, oc)});
  }
  return out.sort((x,y) => x.oc.localeCompare(y.oc) || x.a.titulo.localeCompare(y.a.titulo));
}
function lateList(ignoreFilter){
  const t = todayD();
  return eventsBetween(addDays(t,-180), addDays(t,-1), ignoreFilter).filter(e => e.st === "late");
}
function nextOcc(a, after){
  const list = occurrences(a, after, addMonths(after, 61));
  return list[0];
}

