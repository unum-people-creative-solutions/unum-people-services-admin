
## 📚 Documentação Oficial (Arquitetura e TDDs)

**Nota Importante:** A documentação técnica detalhada, as regras de IA (Harness), os Technical Design Documents (TDDs) e o log de estado contínuo deste projeto **não ficam armazenados neste repositório**. 

Para obter o contexto arquitetural completo e consultar o *Single Source of Truth* do ecossistema, acesse o repositório centralizado de documentação:
👉 **[unum-people-docs](https://github.com/unum-people-creative-solutions/unum-people-docs.git)**

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Fora do Google

O painel inteiro pede para não indexar (`robots` nos metadados de `src/app/layout.tsx`, `noindex, nofollow`) e o `robots.txt` (`src/app/robots.ts`) bloqueia tudo. É um painel interno: quem não está logado só vê a tela `/login` do próprio painel (login direto pelo `amazon-cognito-identity-js`, sem o Hosted UI), que não tem nada a oferecer na busca.

## Termos de Contratação de Serviço

Tela `(admin)/terms` — CRUD de `Term`/`TermVersion` (o operador escreve o conteúdo em Markdown; o backend renderiza, sanitiza e publica em S3). Ao criar, o operador escolhe o **tipo do termo** (Termo de contratação, Termos de uso ou Política de privacidade; padrão contratação; nos dois tipos únicos o formulário avisa que publicar a 1ª versão desativa o termo ativo do mesmo tipo), e o card mostra o tipo. Os seletores de termo em Planos e no tenant (`PlanConfigFields`) mostram só termos de contratação ativos (`termosDeContratacaoAtivos` em `src/lib/termos.ts`; termo antigo sem tipo conta como contratação, a mesma regra da API). Cada card tem **Abrir** e **Excluir**; o Excluir fica inativo, com o motivo embaixo ("Tem aceites registrados" ou "Em uso por um plano ativo"), quando a lista da API traz `bloqueio_exclusao`. Cada `Plan` pago é vinculado a um termo (obrigatório, inclusive para planos já existentes); para tenants `PERSONALIZADO`/`LIVRE` o termo é escolhido manualmente no formulário de criação/edição do tenant. O detalhe do tenant mostra o status do aceite (`ServiceAgreementCard`, ao lado do `BillingCard`) — o aceite em si é sempre feito pelo Administrador do Portal da empresa (permissão `portal.contrato.aceitar`), nunca pelo operador aqui. O painel só aceita o grupo `GlobalAdmin` (desde a fase 5, o grupo legado `Admins` não entra), e o convite de usuário manda só `acessos`, com o Portal. O detalhe do tenant também lista as notas fiscais de serviço emitidas (`TenantInvoicesSection`, mesmo bloco do `BillingCard`/`ServiceAgreementCard`) — busca via `GET /admin/tenants/{id}/invoices`, exibe status/link de PDF quando autorizada; só leitura, sem ação de emissão manual nesta fase.

## Tenant de teste

A listagem (`(admin)/tenants`) e o detalhe do tenant mostram o selo **Teste** (nome acessível "Tenant de teste") quando `is_test_tenant` é verdadeiro; o detalhe mostra também "Cobrança no sandbox do Asaas". O flag só é escolhido na criação (`/tenants/new`) e não aparece na edição; tenant já existente só vira teste pelo comando `cmd/marcar-teste` da API (ADR-0008). A exclusão segue o fluxo normal: cancelar e, por ser de teste, excluir de imediato. Se a exclusão lógica já foi feita (status `excluindo`), o botão "Excluir Tenant" continua ativo e o modal só oferece a exclusão física, com o switch travado.

## Flags

A página **Flags** (`/flags`, item no menu depois de Termos) lista o catálogo de feature flags da API com descrição, apps e a data da última mudança. Cada flag tem um seletor de três estados: **Desligada**, **Só teste** (vale para tenants de teste e para quem está em modo teste) e **Ligada** (para todos). Mudar para **Ligada** pede confirmação; os outros estados mudam direto. A mudança vale em até 1 minuto (cache da API). Flag nova não se cria pela tela: ela nasce no catálogo da API, junto com a funcionalidade que protege.

## Jornada do visitante

O **Dashboard** mostra a seção "Funil da vitrine · últimos 7 dias" (as 9 etapas, de Visitou a Pagou, com a taxa sobre Visitou) e o link **Ver a jornada →**. A etapa "Abriu a contratação" passou a contar a chegada na tela, não só o formulário aberto; a nota "conta a chegada na tela desde <d/m>" ao lado do rótulo sai de `DESDE_CHEGADA_NA_CONTRATACAO` (`src/lib/jornada.ts`), hoje `null` (sem nota) até o lp-builder estar em produção com essa contagem. O cartão **Ativos (pagos)** conta só tenants `ATIVO`, sem bloqueio e sem teste (cálculo na API).

A página **Jornada** (`/dashboard/jornada`, item no menu logo depois do Dashboard) tem o período (1 h, 3 h, 6 h, 12 h, 24 horas, 3, 7, 15 e 30 dias; padrão 24 horas), os filtros de origem (padrão "Anúncio do Google"; as opções são Anúncio do Google, Outra campanha, **Assinatura das páginas**, Outro site e Direto) e aparelho (recalculados na tela a partir das linhas cruas de `GET /admin/dashboard/jornada/funil`, e aplicados também à lista de visitas), o uso do editor (menu "Editar" e o funil da IA) e as visitas do período, com o contratante em link para o tenant e a opção "Mostrar visitas de teste". Cada período é uma janela móvel que termina agora: funil e visitas são pedidos com `?desde=<ms>&ate=<ms>` e contam as visitas que **começaram** na janela (a API devolve as de teste na lista, e a tela as filtra). O botão **Atualizar** recalcula a janela até agora, busca de novo funil, visitas e as visitas abertas, e mostra "Atualizado às HH:MM". O cartão do Dashboard continua com `?de=&ate=` em dias. A origem **Assinatura das páginas** é o clique no link da assinatura Unum People nas páginas publicadas (`utm:assinatura`, `grupoDaOrigem` em `src/lib/jornada.ts`); as outras `utm:*` continuam "Outra campanha". Os horários aparecem em Brasília. Specs: `unum-people-docs/spec/features/unum-people-services/jornada-do-visitante/spec-2-painel.md` e `spec-4-detalhe.md`.

O **Monitoramento** (`/dashboard/errors`) usa os mesmos períodos (a lista `PERIODOS` de `src/lib/jornada.ts`), com 24 horas por padrão, nas duas abas. O selo `ERROR` é vermelho, o `WARN` é amarelo e os demais são verdes. Em "Atividades e Logs Recentes", no Dashboard, vale a mesma regra: só erro em vermelho, `WARN` em amarelo. Nas duas telas o horário dos logs aparece em Brasília: o `@timestamp` do CloudWatch chega em UTC sem fuso e é lido por `instanteDoLog` (`src/lib/horarioDosLogs.ts`); rode os testes também com `TZ=Asia/Tokyo`, porque no fuso de Brasília um erro de fuso passa despercebido.

Na lista de visitas (100 por vez, com "Mostrar mais 100"; acima de 24 horas a hora vem com a data), cada linha **abre embaixo** pelo chevron ou por um clique na linha: o resumo da visita (`resumirVisita` em `src/lib/jornada.ts`), com um cabeçalho com o caminho percorrido e "(saiu aqui)" depois da última página e, por página, passagens, tempo medido, rolagem, seções vistas, ações (etapas, menus e cliques, com iguais seguidos juntos: "Trocou o modelo ×3") e erros que a pessoa viu. O link da hora leva à página do visitante (`/dashboard/jornada/<visitante>`, `GET /visitantes/{id}`), que mostra o bloco "Tempo por página" (soma de todas as visitas), o mesmo resumo em cada visita e a linha do tempo com os rótulos do configurador ("Ficou 42 s nesta página", "Escolheu Pix", "Viu na prévia: Serviços", "Erro: Campo CPF ou CNPJ"). Os cliques do configurador já descrevem a ação e aparecem sem prefixo; os das páginas de entrada continuam com "Clicou: ". Visitas anteriores à coleta do tempo mostram "—".

Na linha aberta e em cada visita da página do visitante, antes do resumo, a lista **Dados da visita** (`DadosDaVisita`, itens de `dadosDaVisita` em `src/lib/jornada.ts`) mostra, só quando o dado existe: "Campanha", "Grupo de anúncio", "Palavra-chave" com a correspondência ("exata", "de frase", "ampla"; "sem termo" quando há grupo ou correspondência mas não o termo), "Navegador" ("Chrome no Android") e "Pagou em <d/m> às <hh:mm>". Visita sem nenhum desses dados não mostra a lista. A correspondência `a` aparece como "(a)" até a conferência da ajuda do Google Ads. Valor fora das listas conhecidas sai como veio da API.

A linha do tempo também rotula os nomes da A1: recarga, volta pelo navegador e página descartada ("Recarregou a página"); o tempo em cada campo da contratação ("Ficou 12 s no campo E-mail"; sem `segundos` o evento não tem rótulo e a tela mostra o nome cru); o envio ("Enviou com Pix", "Enviou com o plano Página"); a volta da fatura e a página no ar; e as miniaturas da vitrine ("Rolou 50% na miniatura do topo", "Tocou na miniatura da galeria"). No resumo da visita, o campo vira a ação "Campo E-mail". Nome sem rótulo mostra o nome cru.

A coluna "Contratou" mostra **Pagou** quando a visita tem `pagou_em` (o pagamento gravado na visita pela API), mesmo que a conta esteja hoje cancelada; sem `pagou_em`, segue `contratacao.pago`. A 9ª etapa do funil ("Pagou") continua vindo de `pagou`.

As fixtures `src/services/__fixtures__/visitas-a1.json`, `visitante-a1.json` e `funil-a2.json` são cópias byte a byte das da API (`internal/handler/testdata/jornada-visitas-a1.json`, `jornada-visitante-a1.json` e `jornada-funil-a2.json`); `jornadaService.test.ts` confere a igualdade e **pula** o par cujo arquivo da API não existe. Com a API em outra pasta (uma worktree), aponte `JORNADA_API_TESTDATA` para o `testdata` dela.

Entre o uso do editor e as visitas fica a seção **Páginas de entrada** (abas Início, Saúde, CRM e Blog; abre na de mais visitas), com rolagem, tempo na página, seções vistas e cliques de cada página, calculados do campo `leitura` do mesmo funil e com os mesmos filtros; a linha do tempo do visitante mostra esses eventos como "Rolou 50%", "Viu: Planos", "Clicou: Topo: ver planos". Spec: `spec-3-leitura.md`.

### Entrada com IA no funil (A2, `configurador-com-ia`)

O funil da página Jornada separa duas séries pela constante `DESDE_ENTRADA_COM_IA` (`src/lib/jornada.ts`, dia `AAAA-MM-DD` em Brasília em que a flag `configurador-ia` ficou **ligada**). Ela fica `null` até esse dia: com `null`, o cartão e a chamada do funil são os de antes. **No dia em que a flag ligar (OPS-09), preencha a data e publique o admin.** Com a data:

- o cartão "Funil" ganha o seletor **Entrada com IA** (desde dd/mm) / **Escolha de modelo** (até dd/mm), aberto na série que tem visitas (as duas têm: a nova);
- a série nova mostra dez etapas: Visitou, Começou, Enviou os dados, Viu o site montado, Editou, Viu a página final, Abriu a contratação, Enviou a contratação, Contratou, Pagou (etapas 1, 10, 11, 12 e 4 a 8 da API, e `pagou`), com "pelo campo do topo: n" sob Começou e "com IA: a · modelo reserva: b · tempo mediano: s s" sob Viu o site montado (mediana das faixas `lp_site_montado_s_1` a `_30` e `_mais`; sem faixas, a parte do tempo some); a antiga, as nove etapas de sempre;
- quando o período cruza a data, a página chama o funil duas vezes (antes, terminando 1 ms antes da meia-noite de Brasília, e a partir dela), mostra a nota "O período cruza a troca da entrada (dd/mm)…" e a tabela de comparação das cinco etapas comuns, "de cada 100 visitas". Uso do editor e Páginas de entrada somam as duas partes. Erro em qualquer das chamadas mostra o erro do cartão.

O "Uso do editor" mostra "Editar com IA" no menu e as linhas da IA nova (pediu mudança, viu as mudanças, resposta sem mudança, aplicou, pedido fora do assunto, viu o convite para contratar) antes das quatro de copiar e colar, que ganharam o sufixo " (copiar e colar)". A linha do tempo rotula "Começou no topo", "Abriu a janela", "Enviou os dados", "Viu o site montado pela IA (14 s)", "Viu o site no modelo reserva (31 s)", os erros da janela, da montagem e do "Editar com IA", e "Voltou do Asaas". Na lista de visitas, "Até onde foi" segue a ordem de avanço das duas séries, e o selo "Usou o editor" não conta o campo do topo nem o site montado. Spec: `unum-people-docs/spec/features/unum-people-services/configurador-com-ia/spec.md` (§2.10, §3.7).

## Modo teste do checkout

Em **Configurações** (`/settings`), a seção "Modo teste do checkout" mostra se o modo está ativo e quando o token foi gerado. **Gerar token** / **Rotacionar token** (com confirmação) cria um token novo, e o anterior deixa de valer na hora. **Mostrar link** revela o link pronto `https://unumpeople.app/configurar?teste=<token>`, com **Copiar link**, e o comando do console do navegador `unumTeste.ativar('<token>')`, com **Copiar comando** (quem prefere ativar pelo console em `unumpeople.app`). **Desligar modo teste** (com confirmação) apaga o token: todo link de teste passa a ser recusado. A base do link vem de `NEXT_PUBLIC_CONFIGURADOR_URL` (padrão `https://unumpeople.app`).

## Planos (produto e cota de páginas)

Tela `(admin)/plans` — o formulário de plano envia `product` (`plataforma` | `landing-page`) e `pages_included`. Plano legado chega da API com `product: ""` (chave presente; o `omitempty` do backend está só no DynamoDB) e `pages_included: 0`; a leitura trata string vazia como `plataforma`. A cota mínima de landing page é validada pelo backend (400/409); a UI só exibe o erro retornado.

Desde planos v2 (2026-11-09) o formulário tem dois checkboxes de restrição: **Esconder a assinatura Unum People na página publicada** (`sem_marca`) e **Sem domínio próprio (só o endereço unumpeople.app)** (`sem_dominio_proprio`). Os dois vão sempre no payload como booleanos (o `PUT` substitui o item inteiro); plano gravado antes dos campos lê `false`. O card da lista mostra "Sem assinatura" e "Sem domínio próprio" quando verdadeiros. Na tela do tenant, a troca para um plano sem domínio próprio com domínio ligado responde `409 dominio_ligado` e a tela mostra "Este plano não inclui domínio próprio e a empresa tem um domínio ligado. Remova o domínio antes de trocar o plano."; o diálogo de cancelamento fala em estorno até 28 dias (eram 14 até a oferta B1; antes, 7).

O formulário também tem **Destaques (um por linha)** (`textarea#destaques`) e **Selo (opcional)** (`input#selo`, `maxLength` 30), que alimentam o card do plano na vitrine pelo catálogo público. Cada linha não vazia vira um item de `destaques` (vírgula não separa); ao editar, o campo mostra os destaques atuais um por linha. **Toda** criação e atualização envia `destaques` (lista, inclusive vazia) e `selo` (string, inclusive vazia): o `PUT /admin/plans/{slug}` do backend substitui o item inteiro, então omitir os campos apagaria os textos. `planService.listPlans` entrega `destaques: []` e `selo: ''` para plano gravado antes dos campos. Limites (até 8 destaques de 80 caracteres, selo de 30) são validados pelo backend (400); a UI só exibe o erro retornado.

Desde a oferta B1 (`oferta-e-primeira-tela`), o plano mensal tem o campo **Plano anual do mesmo degrau** (`select#plano_anual`, logo depois do Termo de Contratação, visível só com o ciclo mensal). As opções são "Sem plano anual" (valor `''`) e os planos de ciclo anual, ativos e desativados, como `{nome} ({slug})`. **Toda** criação e atualização envia `plano_anual`: o valor escolhido no mensal e `''` no anual (o `PUT` substitui o item inteiro, então omitir apagaria a ligação). `planService.listPlans` entrega `plano_anual: ''` para plano sem a chave. A regra do par é da API: o anual precisa existir, ser anual e ter o mesmo produto, serviços, páginas, assinatura, domínio próprio, usuários e termo do mensal; senão a API responde `400` com essa frase e a tela a mostra no alerta do formulário. Por isso a ordem é **anual primeiro, depois o mensal**: ajuste o anual e só então ligue ou mude o mensal.

Desde o configurador com IA, o formulário tem **Editar com IA: teto por dia, em centavos** (`input#ia_teto_diario_centavos`, inteiro de 0 a 1000; vazio permitido). Vazio ou zero: o plano não tem "Editar com IA" nem "Nova página" com IA. **Toda** criação e atualização envia `ia_teto_diario_centavos` (vazio vai como `0`, e a API grava sem o atributo); `planService.listPlans` entrega `0` para plano sem a chave. O limite é da API (`400` "ia_teto_diario_centavos deve ser de 0 a 1000", mostrado no alerta do formulário). A lista mostra "IA: R$ 0,20 por dia" no plano com teto. O teto não entra na regra do par anual (D-C-18): preencha os dois lados com o mesmo valor.

Desde as métricas de visitas (frente E), o formulário tem o checkbox **Contar visitas da página (tela Visitas no Portal)** (`input#metricas_de_visitas`, logo depois de "Esconder a assinatura…"), desmarcado no plano novo. Marcado, liga duas coisas para os clientes do plano: a contagem agregada de visitas e toques nas páginas publicadas (sem identificar o visitante) e a tela **Visitas** no Portal; desmarcado, as páginas param de enviar em cerca de 1 minuto e o Portal volta ao cadeado (ou o item some, se nenhum plano ativo tiver o atributo). **Toda** criação e atualização envia `metricas_de_visitas` como booleano (o `PUT` substitui o item inteiro); `planService.listPlans` entrega `false` para plano sem a chave. O cartão do plano ativo mostra "Métricas de visitas" quando ligado. A tela só grava o atributo; quem coleta e quem vê a tela é decidido pela API. O atributo não entra na regra do par anual: marque os dois lados (mensal e anual). **Liberação:** só marque em plano de produção depois de publicada a política de privacidade v13; aí, em Presença e Captação (mensal e anual), com Página e Página anual desmarcados. Spec: `unum-people-docs/spec/features/unum-people-services/metricas-de-visitas/spec.md` (§2.9, §3.7, §9).

## Papéis e acessos (gestão de acesso, fase 2)

- **Menu Papéis (`/acessos/papeis`):** uma aba por ferramenta do catálogo (`GET /admin/acessos/catalogo`), com os papéis padrão só para leitura e os personalizados com criar, editar e excluir. Na gaveta, marcar uma permissão marca as que ela requer. Um papel em uso não pode ser excluído: o diálogo lista as empresas. A aba Histórico mostra as mudanças de papéis.
- **Detalhe do tenant, Usuários:** uma coluna por ferramenta contratada, mais o Portal. O papel implícito aparece com `*` e, no seletor, como "Automático (…)". O contador "N de M usuários" usa `max_usuarios` do plano. O convite manda `acessos`, e o operador pode convidar acima do limite. A seção "Histórico de acesso" abaixo de Usuários carrega só quando aberta.
- **Planos:** campo "Máximo de usuários" (0 = sem limite).
- Os erros da API aparecem na tela; `ApiError.detalhes` traz o corpo inteiro (`faltando`, `em_uso`).

## Dados do negócio e endereço (`dados-do-negocio`)

- **Detalhe do tenant (`/tenants/[id]`, card "Dados Institucionais"):** exibe o CPF/CNPJ formatado como texto somente leitura, o rótulo "E-mail de cobrança e login do primeiro administrador", o campo editável de Celular e o bloco `EnderecoFields` (CEP com autopreenchimento via ViaCEP em `src/lib/viaCep.ts`, Rua, Número, Complemento, Bairro, Cidade e UF). Quando `endereco_pendente` é verdadeiro, mostra o selo **"Sem endereço: a nota fiscal não sai"** ao lado do status. Erros `422` (`asaas_recusou`, com o detalhe textual do Asaas) e `503` (`asaas_indisponivel`) são exibidos como alerta no próprio card.
- **Criar tenant (`/tenants/new`):** inclui Celular e `EnderecoFields`. Para planos `PAGO` e `PERSONALIZADO`, o endereço completo é obrigatório antes do envio (e também validado pela API com `400 endereco_obrigatorio`); para o plano `LIVRE`, o endereço continua opcional.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
