import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

type FontRecord = {
  file: string;
  family: string;
  format: string;
  url: string;
};

@customElement("tadpole-app")
export class TadpoleApp extends LitElement {
  @state() private fonts: FontRecord[] = [];
  @state() private loading = true;
  @state() private error = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.fetchFonts();
  }

  private async fetchFonts(): Promise<void> {
    try {
      const response = await fetch("/api/fonts");
      const payload = (await response.json()) as FontRecord[];
      this.fonts = Array.isArray(payload) ? payload : [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.error = `Could not reach backend font service. ${message}`;
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (this.loading) {
      return html`<section class="panel"><h1>Tadpole</h1><p>Loading fonts…</p></section>`;
    }

    if (this.error) {
      return html`
        <section class="panel">
          <h1>Tadpole</h1>
          <p class="error">${this.error}</p>
          <p>Start backend with <code>npm run dev:backend</code>.</p>
        </section>
      `;
    }

    return html`
      <section class="panel">
        <h1>Tadpole</h1>
        <p>Monorepo template for an SVG timeline tool + font-aware service.</p>
      </section>

      <section class="panel">
        <h2>Detected Fonts</h2>
        ${this.fonts.length === 0
          ? html`<p class="muted">No fonts found in <code>backend/fonts</code>.</p>`
          : html`
            <ul>
              ${this.fonts.map(
                (font) => html`
                  <li>
                    <strong>${font.family}</strong>
                    <span>${font.format.toUpperCase()}</span>
                    <a href=${font.url} target="_blank" rel="noreferrer">download</a>
                    <a href="${font.url}/stylesheet" target="_blank" rel="noreferrer">css</a>
                  </li>
                `
              )}
            </ul>
          `}
      </section>
    `;
  }

  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      padding: 2rem;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      color: #e5e7eb;
      display: grid;
      gap: 1rem;
      place-items: center;
      background: transparent;
    }

    .panel {
      width: min(900px, 100%);
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 1rem;
      padding: 1.25rem;
      backdrop-filter: blur(2px);
      background: rgba(15, 23, 42, 0.65);
      box-shadow: 0 16px 30px rgba(0, 0, 0, 0.25);
    }

    h1, h2 {
      margin: 0 0 0.5rem;
    }

    h1 {
      font-size: 2rem;
      letter-spacing: 0.01em;
    }

    p, li, code {
      color: #bfdbfe;
    }

    .error {
      color: #fca5a5;
    }

    .muted {
      color: #93c5fd;
    }

    ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }

    a {
      color: #fca5a5;
      text-decoration: none;
    }
  `;
}
