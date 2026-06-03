import "./styles.css";
import { mount } from "svelte";
import App from "./App.svelte";

const app = mount(App, {
  target: document.querySelector("#app") ?? document.body,
});

export default app;
