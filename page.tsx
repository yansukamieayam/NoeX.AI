"use client";

import { FormEvent, useState } from "react";

type TabType = "login" | "register";
type Message = {
  role: "assistant" | "user";
  content: string;
};

export default function HomePage() {
  const [tab, setTab] = useState<TabType>("login");
  const [isAppVisible, setIsAppVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [theme, setTheme] = useState<"dark" | "graphite">("dark");
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Halo! Ada yang bisa saya bantu hari ini?" },
  ]);
  const [input, setInput] = useState("");

  const switchTab = (nextTab: TabType) => {
    setTab(nextTab);
    setAlertMessage("");
  };

  const login = (event: FormEvent) => {
    event.preventDefault();

    const email = (document.getElementById("login-email") as HTMLInputElement | null)?.value.trim();
    const password = (document.getElementById("login-password") as HTMLInputElement | null)?.value.trim();

    if (!email || !password) {
      setAlertMessage("Email dan kata sandi wajib diisi.");
      return;
    }

    setAlertMessage("Demo login berhasil. Memindahkan ke dashboard...");
    setTimeout(() => {
      setIsAppVisible(true);
      setAlertMessage("");
    }, 700);
  };

  const register = (event: FormEvent) => {
    event.preventDefault();

    const name = (document.getElementById("reg-name") as HTMLInputElement | null)?.value.trim();
    const email = (document.getElementById("reg-email") as HTMLInputElement | null)?.value.trim();
    const password = (document.getElementById("reg-password") as HTMLInputElement | null)?.value.trim();

    if (!name || !email || !password) {
      setAlertMessage("Lengkapi semua field untuk daftar akun.");
      return;
    }

    setAlertMessage("Akun demo berhasil dibuat.");
    setTimeout(() => {
      setIsAppVisible(true);
      setAlertMessage("");
    }, 700);
  };

  const loginWithOAuth = (provider: string) => {
    setAlertMessage(`Demo login dengan ${provider} berhasil.`);
    setTimeout(() => {
      setIsAppVisible(true);
      setAlertMessage("");
    }, 700);
  };

  const sendMessage = () => {
    const message = input.trim();
    if (!message) return;

    const nextMessages: Message[] = [...messages, { role: "user", content: message }];
    setMessages(nextMessages);
    setInput("");

    const reply = `Saya menerima pesanmu: "${message}". Ini adalah demo UI, belum terhubung ke backend real.`;
    setTimeout(() => {
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    }, 350);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "graphite" : "dark"));
  };

  const toggleMotion = () => {
    setMotionEnabled((current) => !current);
  };

  return (
    <main className={`page-shell ${theme === "graphite" ? "graphite" : "dark"} ${motionEnabled ? "" : "motion-off"}`}>
      <div className="ambient" aria-hidden="true">
        <div className="ambient-grid" />
        <div className="ambient-orb orb-one" />
        <div className="ambient-orb orb-two" />
        <div className="ambient-orb orb-three" />
        <div className="ambient-grain" />
        <div id="cursor-light" />
      </div>

      {!isAppVisible && (
        <div id="view-auth" className="auth-view">
          <div className="auth-shell">
            <div className="auth-card glass">
              <aside className="brand-panel">
                <div className="brand-top">
                  <div className="brand">
                    <span className="brand-mark">N</span>
                    <span>
                      NoeX<span className="brand-ai">.ai</span>
                    </span>
                  </div>
                  <span className="edition">LIQUID EDITION</span>
                </div>

                <div className="brand-copy">
                  <div className="eyebrow">Platform AI generasi terbaru</div>
                  <h1>Lanjutkan kerja dari tempat kamu berhenti.</h1>
                  <p>Percakapan, dokumen, dan proyek kreatifmu dalam satu ruang.</p>
                </div>

                <div className="art-scene" aria-hidden="true">
                  <div className="art-parallax" />
                  <div className="floating-note glass">
                    <span>Ide mengalir.</span>
                  </div>
                </div>

                <div className="brand-footer">
                  <span>Ruang personal untuk pikiran besarmu.</span>
                </div>
              </aside>

              <main className="form-panel">
                <button type="button" className="icon-btn theme-toggle auth-theme" onClick={toggleTheme} aria-label="Toggle theme">
                  ☀
                </button>

                <div className="auth-content">
                  <div className="form-heading">
                    <span className="overline">RUANG IDEMU, KEMBALI TERBUKA</span>
                    <h2 id="auth-heading">{tab === "login" ? "Selamat datang kembali." : "Ide besar dimulai di sini."}</h2>
                    <p id="auth-subheading">
                      {tab === "login" ? "Masuk dan lanjutkan hal-hal hebatmu." : "Buat ruangmu. Mulai sesuatu yang berarti."}
                    </p>
                  </div>

                  <div className="auth-tabs" role="tablist" aria-label="Masuk atau daftar">
                    <button
                      type="button"
                      className={tab === "login" ? "active" : ""}
                      onClick={() => switchTab("login")}
                    >
                      Masuk
                    </button>
                    <button
                      type="button"
                      className={tab === "register" ? "active" : ""}
                      onClick={() => switchTab("register")}
                    >
                      Daftar akun
                    </button>
                  </div>

                  {alertMessage && (
                    <div className="notice" role="status">
                      <span>{alertMessage}</span>
                    </div>
                  )}

                  <div className="social-buttons">
                    <button type="button" className="btn btn-glass" onClick={() => loginWithOAuth("Google")}>
                      Google
                    </button>
                    <div className="social-row">
                      <button type="button" className="btn btn-glass" onClick={() => loginWithOAuth("GitHub")}>
                        GitHub
                      </button>
                      <button type="button" className="btn btn-glass" onClick={() => loginWithOAuth("Apple")}>
                        Apple
                      </button>
                    </div>
                  </div>

                  <div className="separator">
                    <span />
                    <span>atau dengan email</span>
                    <span />
                  </div>

                  {tab === "login" ? (
                    <form onSubmit={login}>
                      <div className="field">
                        <label htmlFor="login-email">Alamat email</label>
                        <input id="login-email" type="email" placeholder="nama@domain.com" required />
                      </div>

                      <div className="field">
                        <label htmlFor="login-password">Kata sandi</label>
                        <input id="login-password" type="password" placeholder="Masukkan kata sandi" required />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full">
                        Masuk ke Akun
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={register}>
                      <div className="field">
                        <label htmlFor="reg-name">Nama lengkap</label>
                        <input id="reg-name" type="text" placeholder="Nama lengkapmu" required />
                      </div>

                      <div className="field">
                        <label htmlFor="reg-email">Alamat email</label>
                        <input id="reg-email" type="email" placeholder="nama@domain.com" required />
                      </div>

                      <div className="field">
                        <label htmlFor="reg-password">Buat kata sandi</label>
                        <input id="reg-password" type="password" placeholder="Minimal 8 karakter" required />
                      </div>

                      <button type="submit" className="btn btn-primary btn-full">
                        Buat Akun Baru
                      </button>
                    </form>
                  )}

                  <p className="terms">
                    Dengan melanjutkan, kamu menyetujui&nbsp;
                    <button type="button" className="inline-link">Ketentuan Layanan</button>
                    &nbsp;dan&nbsp;
                    <button type="button" className="inline-link">Kebijakan Privasi</button>.
                  </p>
                </div>
              </main>
            </div>

            <footer className="auth-footer">
              <span>© 2026 NoeX.ai</span>
              <button type="button" className="motion-toggle" onClick={toggleMotion}>
                {motionEnabled ? "Efek hidup aktif" : "Efek hidup nonaktif"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {isAppVisible && (
        <div id="view-app" className="app-view">
          <aside className="sidebar glass">
            <div className="sidebar-brand">
              <div className="brand">
                <span className="brand-mark">N</span>
                <span>
                  NoeX<span className="brand-ai">.ai</span>
                </span>
              </div>
            </div>

            <div className="sidebar-actions">
              <button type="button" className="btn btn-primary btn-full">
                Percakapan baru
              </button>
            </div>

            <nav className="history" aria-label="Riwayat percakapan">
              <div className="history-item active">Idea launch campaign</div>
              <div className="history-item">Riset audiens</div>
              <div className="history-item">SEO content plan</div>
            </nav>
          </aside>

          <main className="chat-main">
            <header className="chat-header glass">
              <button type="button" className="icon-btn" aria-label="Toggle sidebar">
                ☰
              </button>
              <div className="chat-title-wrap">
                <h1>Percakapan baru</h1>
              </div>
              <button type="button" className="icon-btn theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
                ☀
              </button>
            </header>

            <div className="messages" aria-live="polite">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                  <div className="bubble">{message.content}</div>
                </div>
              ))}
            </div>

            <div className="composer-area">
              <div className="composer glass">
                <div className="composer-input-line">
                  <textarea
                    rows={1}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Tulis pesan atau idemu..."
                    aria-label="Input chat"
                  />
                  <button type="button" className="send-btn" onClick={sendMessage} aria-label="Kirim pesan">
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </main>
  );
}
