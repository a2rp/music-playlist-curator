import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./styles.module.css";

const ConfirmDialog = ({ title, description, confirmLabel = "Delete", onCancel, onConfirm }) => {
    const dialogRef = useRef(null);
    const cancelRef = useRef(null);
    const cancelHandler = useRef(onCancel);
    cancelHandler.current = onCancel;

    useEffect(() => {
        const appRoot = document.getElementById("root");
        const previousActiveElement = document.activeElement;
        const previousOverflow = document.body.style.overflow;
        const previousInert = appRoot?.inert ?? false;
        const previousAriaHidden = appRoot?.getAttribute("aria-hidden");

        if (appRoot) {
            appRoot.inert = true;
            appRoot.setAttribute("aria-hidden", "true");
        }
        document.body.style.overflow = "hidden";
        cancelRef.current?.focus({ preventScroll: true });

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                cancelHandler.current();
                return;
            }
            if (event.key !== "Tab") return;

            const dialog = dialogRef.current;
            if (!dialog) return;
            const focusable = Array.from(dialog.querySelectorAll("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"));
            if (focusable.length === 0) {
                event.preventDefault();
                dialog.focus();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const focusIsInside = dialog.contains(document.activeElement);
            if (event.shiftKey && (document.activeElement === first || !focusIsInside)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && (document.activeElement === last || !focusIsInside)) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = previousOverflow;
            if (appRoot) {
                appRoot.inert = previousInert;
                if (previousAriaHidden === null) appRoot.removeAttribute("aria-hidden");
                else appRoot.setAttribute("aria-hidden", previousAriaHidden);
            }

            if (previousActiveElement?.isConnected && typeof previousActiveElement.focus === "function") {
                previousActiveElement.focus({ preventScroll: true });
            } else {
                document.getElementById("track-list-heading")?.focus({ preventScroll: true });
            }
        };
    }, []);

    return createPortal(
        <div className={styles.overlay} onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
            <section ref={dialogRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" tabIndex={-1}>
                <span className={styles.icon}><FiAlertTriangle aria-hidden="true" /></span>
                <h2 id="confirm-title">{title}</h2>
                <p id="confirm-description">{description}</p>
                <div className={styles.actions}>
                    <button type="button" ref={cancelRef} onClick={onCancel}>Cancel</button>
                    <button type="button" className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
                </div>
            </section>
        </div>,
        document.body,
    );
};

export default ConfirmDialog;