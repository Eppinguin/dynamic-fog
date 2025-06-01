import { createRoot } from "react-dom/client";
import { ImportModal } from "./components/ImportModal";
import { PluginGate } from "./util/PluginGate";
import { PluginThemeProvider } from "./util/PluginThemeProvider";

const root = createRoot(document.getElementById("root")!);
root.render(
  <PluginGate>
    <PluginThemeProvider>
      <ImportModal />
    </PluginThemeProvider>
  </PluginGate>
);
