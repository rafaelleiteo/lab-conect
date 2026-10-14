const https = require('https');

const SUPABASE_URL = "cmltaaakiqbsqbckkyjh.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtbHRhYWFraXFic3FiY2treWpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMzMzNDIsImV4cCI6MjA5OTkwOTM0Mn0.ngWqBtLgf7xBMYFB0W6LGx5_pxSDJrwzzOPgOmT20QI";

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request({
      hostname: SUPABASE_URL,
      path: path,
      method: method,
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log("=== EXECUTANDO TESTE COMPLETO VIA NODE NATIVO ===");
  
  // 1. Auth Lab
  const labAuth = await request('POST', '/auth/v1/token?grant_type=password', {
    email: 'lab@updigital.test',
    password: '123456'
  });
  const labToken = labAuth.body.access_token;
  console.log("Lab Auth Status:", labAuth.status);

  // 2. Auth Dentista
  const dentAuth = await request('POST', '/auth/v1/token?grant_type=password', {
    email: 'dentista@updigital.test',
    password: '123456'
  });
  const dentToken = dentAuth.body.access_token;
  console.log("Dentist Auth Status:", dentAuth.status);

  // 3. Lab ID
  const labs = await request('GET', '/rest/v1/labs?subdominio=eq.updigital&select=id,nome', null, labToken);
  const labId = labs.body[0].id;
  console.log("Lab ID:", labId);

  // 4. Dentista ID
  const dents = await request('GET', '/rest/v1/dentists?email=eq.dentista@updigital.test&select=id,nome,cro,uf', null, dentToken);
  const dentistId = dents.body[0].id;
  console.log("Dentist ID:", dentistId);

  // 5. Product ID
  const prods = await request('GET', `/rest/v1/products?lab_id=eq.${labId}&select=id&limit=1`, null, labToken);
  const productId = prods.body[0].id;

  // 6. Passo 3.1 — Criar Pedido Órfão 1 (SP-999999 / SP)
  const o1 = await request('POST', '/rest/v1/orders', {
    lab_id: labId,
    product_id: productId,
    dentist_id: null,
    cro_pendente: "SP-999999",
    uf_pendente: "SP",
    nome_dentista_pendente: "Dr. Teste Órfão SP",
    paciente: "Paciente Teste SP",
    valor: 450,
    status: "recebido"
  }, labToken);
  console.log("\n1. Pedido 1 (Órfão SP):", o1.status, o1.body?.[0]?.id ?? o1.body);

  // 7. Passo 3.4 — Criar Pedido Órfão 2 (SP-999999 / RJ) [Negativo]
  const o2 = await request('POST', '/rest/v1/orders', {
    lab_id: labId,
    product_id: productId,
    dentist_id: null,
    cro_pendente: "SP-999999",
    uf_pendente: "RJ",
    nome_dentista_pendente: "Dr. Teste Órfão RJ",
    paciente: "Paciente Teste RJ",
    valor: 300,
    status: "recebido"
  }, labToken);
  console.log("2. Pedido 2 (Órfão RJ):", o2.status, o2.body?.[0]?.id ?? o2.body);

  // 8. Passo 3.2 — Editar Meu perfil (CRO SP-999999 e UF SP)
  const updDent = await request('PATCH', `/rest/v1/dentists?id=eq.${dentistId}`, {
    cro: "SP-999999",
    uf: "SP",
    telefone: "(11) 99999-9999"
  }, dentToken);
  console.log("3. Atualização Perfil Dentista:", updDent.status);

  // 9. Executar autoLinkOrphanedOrders (Update orders + insert link)
  const linkOrders = await request('PATCH', `/rest/v1/orders?cro_pendente=eq.SP-999999&uf_pendente=eq.SP`, {
    dentist_id: dentistId
  }, dentToken);
  console.log("4. Execução de Auto-link em Orders:", linkOrders.status);

  await request('POST', '/rest/v1/dentist_lab_links', {
    dentist_id: dentistId,
    lab_id: labId
  }, dentToken);

  // 10. Passo 3.5 — Verificação final
  const res1 = await request('GET', `/rest/v1/orders?id=eq.${o1.body?.[0]?.id}&select=id,dentist_id,cro_pendente,uf_pendente`, null, dentToken);
  const res2 = await request('GET', `/rest/v1/orders?id=eq.${o2.body?.[0]?.id}&select=id,dentist_id,cro_pendente,uf_pendente`, null, labToken);
  const resLink = await request('GET', `/rest/v1/dentist_lab_links?dentist_id=eq.${dentistId}&lab_id=eq.${labId}&select=id`, null, dentToken);

  console.log("\n=== CONFERÊNCIA DOS RESULTADOS DOS TESTES ===");
  console.log("-> Pedido 1 (SP):", JSON.stringify(res1.body));
  console.log("-> Pedido 2 (RJ):", JSON.stringify(res2.body));
  console.log("-> Parceria Link:", JSON.stringify(resLink.body));
}

run().catch(console.error);
