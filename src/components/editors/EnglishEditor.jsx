import { useEffect, useRef } from "react";

function EnglishEditor({ value, onChange, label = "English content", readOnly = false }) {
    const editorRef = useRef(null);

    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
            editorRef.current.innerHTML = value || "";
        }
    }, [value]);

    const format = (command, commandValue = null) => {
        if (!readOnly) {
            document.execCommand(command, false, commandValue);
            onChange(editorRef.current?.innerHTML || "");
            editorRef.current?.focus();
        }
    };

    return (
        <div className="rich-editor">
            <div className="rich-editor-toolbar" aria-label={`${label} formatting toolbar`}>
                <button type="button" onClick={() => format("bold")}><strong>B</strong></button>
                <button type="button" onClick={() => format("italic")}><em>I</em></button>
                <button type="button" onClick={() => format("underline")}><u>U</u></button>
                <button type="button" onClick={() => format("formatBlock", "h2")}>H2</button>
                <button type="button" onClick={() => format("formatBlock", "p")}>P</button>
                <button type="button" onClick={() => format("insertUnorderedList")}>List</button>
                <button type="button" onClick={() => format("insertOrderedList")}>1.</button>
                <button type="button" onClick={() => format("justifyLeft")}>Left</button>
                <button type="button" onClick={() => format("justifyCenter")}>Center</button>
                <button type="button" onClick={() => format("removeFormat")}>Clear</button>
                <button type="button" onClick={() => format("undo")}>Undo</button>
                <button type="button" onClick={() => format("redo")}>Redo</button>
            </div>
            <div
                ref={editorRef}
                className="rich-editor-content"
                contentEditable={!readOnly}
                role="textbox"
                aria-label={label}
                suppressContentEditableWarning
                onInput={(event) => onChange(event.currentTarget.innerHTML)}
            />
            <div className="rich-editor-status">{(value || "").replace(/<[^>]*>/g, "").length} characters</div>
        </div>
    );
}

export default EnglishEditor;
