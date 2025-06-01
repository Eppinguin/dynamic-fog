import OBR from "@owlbear-rodeo/sdk";
import { getPluginId } from "../util/getPluginId";
import importIcon from "../assets/import-uvtt.svg";

export function createImportMenu() {
  // Add button to the fog tool submenu for importing UVTT/DD2VTT files
  OBR.tool.createAction({
    id: getPluginId("import-uvtt"),
    icons: [
      {
        icon: importIcon,
        label: "Import UVTT/DD2VTT",
        filter: {
          activeTools: ["rodeo.owlbear.tool/fog"],
        },
      },
    ],
    async onClick() {
      await OBR.modal.open({
        id: getPluginId("import-modal"),
        url: "/src/menu/modal.html",
        height: 250,
        width: 400,
      });
    },
  });
}
