import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css"
import "./translations"
import { loadDefaultColors } from "./ThemeConfigurator";


loadDefaultColors()

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <App />
);
