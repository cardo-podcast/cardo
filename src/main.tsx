import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css"
import "./engines/translations"
import { postupdate } from "./postupdate";


postupdate().then(
    () => {
        ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
            <App />
        );
    }
)

