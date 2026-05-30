<script lang="ts">
  import { onMount } from "svelte";

  type FontRecord = {
    file: string;
    family: string;
    format: string;
    url: string;
  };

  let fonts: FontRecord[] = [];
  let loading = true;
  let error = "";

  const fetchFonts = async () => {
    try {
      const response = await fetch("/api/fonts");
      const payload = (await response.json()) as FontRecord[];
      fonts = Array.isArray(payload) ? payload : [];
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      error = `Could not reach backend font service. ${message}`;
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    void fetchFonts();
  });
</script>

<section class="panel">
  <h1>Tadpole</h1>
  <p>Monorepo template for an SVG timeline tool + font-aware service.</p>
</section>

{#if loading}
  <section class="panel">
    <h1>Tadpole</h1>
    <p>Loading fonts…</p>
  </section>
{:else if error}
  <section class="panel">
    <h1>Tadpole</h1>
    <p class="error">{error}</p>
    <p>Start backend with <code>npm run dev:backend</code>.</p>
  </section>
{:else}
  <section class="panel">
    <h2>Detected Fonts</h2>
    {#if fonts.length === 0}
      <p class="muted">No fonts found in <code>backend/fonts</code>.</p>
    {:else}
      <ul>
        {#each fonts as font}
          <li>
            <strong>{font.family}</strong>
            <span>{font.format.toUpperCase()}</span>
            <a href={font.url} target="_blank" rel="noreferrer">download</a>
            <a href={`${font.url}/stylesheet`} target="_blank" rel="noreferrer">css</a>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  :global(:host) {
    display: block;
  }

  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 20% 20%, rgba(56, 189, 248, 0.2), transparent 40%),
      radial-gradient(circle at 80% 0%, rgba(129, 140, 248, 0.2), transparent 35%),
      #0f172a;
  }

  :global(body),
  :global(html) {
    margin: 0;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(#app) {
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

  h1,
  h2 {
    margin: 0 0 0.5rem;
  }

  h1 {
    font-size: 2rem;
    letter-spacing: 0.01em;
  }

  p,
  li,
  code {
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
</style>
