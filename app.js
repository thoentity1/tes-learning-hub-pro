// TES Learning Hub Pro — Phase 2 Super Admin + organisation registration
// Use only the Supabase Project URL and anon/publishable key. Never expose service_role.
const SUPABASE_URL = "https://xoyxnotdpqufaenqjueh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhveXhub3RkcHF1ZmFlbnFqdWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxNzE3NDcsImV4cCI6MjExMDc0Nzc0N30.oLBsPIf5RpFymMdkSmXQi1yiRlTluZG37lFpAqJArd0";
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("https://xoyxnotdpqufaenqjueh.supabase.co") && !SUPABASE_ANON_KEY.includes("sb_publishable_rTpeqREzqqdvXovDck9MxA_tegQEwZZ"");
const sb = configured && window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const $ = id => document.getElementById(id);
let currentUser = null;

function loginView(message = "") {
  $("loginPanel").hidden = false; $("dashboardPanel").hidden = true;
  $("signOutBtn").hidden = true; $("connectionLabel").textContent = configured ? "Sign in required" : "Setup required";
  $("authMessage").textContent = message;
}
function showApp(user) {
  currentUser = user;
  $("loginPanel").hidden = true; $("dashboardPanel").hidden = false;
  $("signOutBtn").hidden = false; $("connectionLabel").textContent = "Connected securely";
  $("avatar").textContent = (user.email || "T")[0].toUpperCase();
  $("welcomeText").textContent = `Signed in as ${user.email}`;
  loadOrganisationCount();
}
function showView(name) {
  ["overview","organisations","placeholder"].forEach(v => $(v+"View").hidden = true);
  if (name === "overview" || name === "organisations") $(name+"View").hidden = false;
  else { $("placeholderView").hidden = false; $("placeholderTitle").textContent = name+" — scheduled for next phase"; }
  document.querySelectorAll(".nav-item").forEach(a => a.classList.toggle("active", a.dataset.view === name));
  $("pageTitle").textContent = name === "overview" ? "Super Admin Overview" : name[0].toUpperCase()+name.slice(1);
  if (name === "organisations") loadOrganisations();
}
async function checkAdmin(user) {
  const {data, error} = await sb.from("profiles").select("platform_role").eq("id", user.id).single();
  if (error) { loginView("Could not verify your platform role: "+error.message); await sb.auth.signOut(); return false; }
  if (data.platform_role !== "super_admin") { loginView("Access denied: this account is not configured as a TES Super Admin. Ask the platform owner to verify its profile role."); await sb.auth.signOut(); return false; }
  showApp(user); return true;
}
async function loadOrganisationCount() {
  const {count, error} = await sb.from("organisations").select("*",{count:"exact",head:true});
  $("orgCount").textContent = error ? "—" : String(count ?? 0);
}
async function loadOrganisations() {
  $("orgTable").innerHTML = '<tr><td colspan="4">Loading…</td></tr>';
  const {data,error} = await sb.from("organisations").select("id,name,slug,status,created_at").order("created_at",{ascending:false});
  if (error) { $("orgTable").innerHTML = `<tr><td colspan="4">Could not load: ${escapeHtml(error.message)}</td></tr>`; return; }
  if (!data.length) { $("orgTable").innerHTML = '<tr><td colspan="4">No organisations registered yet. Use “Register organisation” to add the first one.</td></tr>'; }
  else $("orgTable").innerHTML = data.map(o=>`<tr><td><strong>${escapeHtml(o.name)}</strong></td><td>${escapeHtml(o.slug)}</td><td><span class="tag ${o.status==="active"?"complete":"pending"}">${escapeHtml(o.status)}</span></td><td>${new Date(o.created_at).toLocaleDateString()}</td></tr>`).join("");
  loadOrganisationCount();
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

$("loginForm").addEventListener("submit", async e=>{
  e.preventDefault();
  if (!sb) { $("authMessage").textContent="Add your new Supabase Project URL and anon/publishable key in app.js first."; return; }
  $("authMessage").textContent="Signing in…";
  const {data,error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if(error){$("authMessage").textContent=error.message;return;}
  await checkAdmin(data.user);
});
$("signOutBtn").addEventListener("click",()=>sb?.auth.signOut());
document.querySelectorAll(".nav-item").forEach(a=>a.addEventListener("click",e=>{e.preventDefault();showView(a.dataset.view);}));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.go)));
$("showOrgForm").addEventListener("click",()=>{$("orgFormPanel").hidden=false;$("orgName").focus();});
$("cancelOrgForm").addEventListener("click",()=>{$("orgFormPanel").hidden=true;$("orgForm").reset();$("orgMessage").textContent="";});
$("refreshOrgs").addEventListener("click",loadOrganisations);
$("orgName").addEventListener("input",()=>{if(!$("orgSlug").dataset.edited)$("orgSlug").value=$("orgName").value.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");});
$("orgSlug").addEventListener("input",()=>{$("orgSlug").dataset.edited="1";});
$("orgForm").addEventListener("submit",async e=>{
  e.preventDefault(); if(!sb||!currentUser)return;
  const name=$("orgName").value.trim(), slug=$("orgSlug").value.trim().toLowerCase();
  if(!/^[a-z0-9-]+$/.test(slug)){ $("orgMessage").textContent="Workspace ID may contain only lowercase letters, numbers and hyphens.";return; }
  $("orgMessage").textContent="Creating organisation…";
  const {error}=await sb.from("organisations").insert({name,slug,created_by:currentUser.id});
  if(error){$("orgMessage").textContent="Could not create organisation: "+error.message;return;}
  $("orgMessage").textContent="Organisation created successfully.";
  $("orgForm").reset(); delete $("orgSlug").dataset.edited; await loadOrganisations();
});
if(!configured) loginView("Supabase is not connected yet. Add your new project's URL and anon/publishable key in app.js.");
else {
  loginView();
  sb.auth.getSession().then(async({data,error})=>{if(error){loginView(error.message);return;}if(data.session)await checkAdmin(data.session.user);});
  sb.auth.onAuthStateChange(async(_event,session)=>{if(session && !currentUser) await checkAdmin(session.user); else if(!session){currentUser=null;loginView();}});
}
