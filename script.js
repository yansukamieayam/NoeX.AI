const viewAuth = document.getElementById("view-auth");
const viewApp = document.getElementById("view-app");
const formLogin = document.getElementById("form-login");
const formRegister = document.getElementById("form-register");
const authHeading = document.getElementById("auth-heading");
const authSubheading = document.getElementById("auth-subheading");
const authAlert = document.getElementById("auth-alert");
const alertMsg = document.getElementById("alert-msg");

function switchTab(tab) {
  const isLogin = tab === "login";

  formLogin.hidden = !isLogin;
  formRegister.hidden = isLogin;

  document.getElementById("tab-login").classList.toggle("active", isLogin);
  document.getElementById("tab-register").classList.toggle("active", !isLogin);

  authHeading.textContent = isLogin ? "Selamat datang kembali." : "Ide besar dimulai di sini.";
  authSubheading.textContent = isLogin
    ? "Masuk dan lanjutkan hal-hal hebatmu."
    : "Buat ruangmu. Mulai sesuatu yang berarti.";

  hideAlert();
}

function showAlert(message) {
  alertMsg.textContent = message;
  authAlert.hidden = false;
}

function hideAlert() {
  authAlert.hidden = true;
}

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();

  if (!email || !password) {
    showAlert("Email dan kata sandi wajib diisi.");
    return;
  }

  showAlert("Demo login berhasil. Memindahkan ke dashboard...");
  setTimeout(() => {
    viewAuth.hidden = true;
    viewApp.hidden = false;
    hideAlert();
  }, 700);
}

function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();

  if (!name || !email || !password) {
    showAlert("Lengkapi semua field untuk daftar akun.");
    return;
  }

  showAlert("Akun demo berhasil dibuat.");
  setTimeout(() => {
    viewAuth.hidden = true;
    viewApp.hidden = false;
    hideAlert();
  }, 700);
}

function loginWithOAuth(provider) {
  showAlert(`Demo login dengan ${provider} berhasil.`);
  setTimeout(() => {
    viewAuth.hidden = true;
    viewApp.hidden = false;
    hideAlert();
  }, 700);
}

function handleSendClick() {
  const input = document.getElementById("input");
  const message = input.value.trim();

  if (!message) return;

  const messages = document.getElementById("messages");

  const userBubble = document.createElement("div");
  userBubble.className = "message user";
  userBubble.innerHTML = `<div class="bubble">${message}</div>`;
  messages.appendChild(userBubble);

  const reply = document.createElement("div");
  reply.className = "message assistant";
  reply.innerHTML = `<div class="bubble">Saya menerima pesanmu: "${message}". Ini adalah demo UI, belum terhubung ke backend real.</div>`;

  messages.appendChild(reply);

  input.value = "";
  messages.scrollTop = messages.scrollHeight;
}

function toggleTheme() {
  const root = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "graphite" : "dark");
}

function toggleMotion() {
  document.body.classList.toggle("motion-off");
}

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  sidebar.hidden = !sidebar.hidden;
}

document.getElementById("input").addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = Math.min(this.scrollHeight, 180) + "px";
});
