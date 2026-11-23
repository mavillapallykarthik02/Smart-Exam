import { useEffect, useRef } from "react";
import "mathlive";
import katex from "katex";
import "katex/dist/katex.min.css";

const SYMBOL_CATEGORIES = [
    { name: "Basic", symbols: ["−", "×", "÷", "=", "\\ne", "\\approx", "\\pm", "\\infty", "%"] },
    { name: "Greek", symbols: ["\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon", "\\theta", "\\lambda", "\\mu", "\\pi", "\\rho", "\\sigma", "\\Omega"] },
    { name: "Fractions", symbols: ["\\frac{}{}", "\\dfrac{}{}", "\\sqrt{}", "\\sqrt[n]{}", "|{}|", "()"] },
    { name: "Powers", symbols: ["{}^{}", "{}_{}", "{}^{ }", "{}_{ }"] },
    { name: "Calculus", symbols: ["\\frac{d}{dx}", "\\int", "\\iint", "\\iiint", "\\partial", "\\lim_{x\\to }", "\\sum_{ }^{ }", "\\prod_{ }^{ }", "\\nabla"] },
    { name: "Trigonometry", symbols: ["\\sin", "\\cos", "\\tan", "\\cot", "\\sec", "\\cosec", "\\arcsin", "\\arccos", "\\arctan"] },
    { name: "Matrices", symbols: ["\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}", "\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}", "\\begin{vmatrix}a&b\\\\c&d\\end{vmatrix}"] },
    { name: "Relations", symbols: ["\\neq", "\\le", "\\ge", "\\lt", "\\gt", "\\in", "\\subset", "\\subseteq", "\\cup", "\\cap"] },
    { name: "Advanced", symbols: ["\\vec{}", "\\overrightarrow{}", "\\overline{}", "\\begin{cases}a&x>0\\\\b&x\\le0\\end{cases}", "\\mathbb{C}", "\\forall", "\\exists"] }
];

function EquationEditor({ value = "", onChange, label = "Mathematical equations", readOnly = false }) {
    const fieldRef = useRef(null);
    const previewRef = useRef(null);

    useEffect(() => {
        const field = fieldRef.current;
        if (field && field.value !== value) field.value = value;
    }, [value]);

    useEffect(() => {
        if (previewRef.current) {
            previewRef.current.innerHTML = "";
            if (value) {
                try {
                    katex.render(value, previewRef.current, { throwOnError: false, displayMode: true });
                } catch {
                    previewRef.current.textContent = value;
                }
            }
        }
    }, [value]);

    const insertSymbol = (symbol) => {
        const field = fieldRef.current;
        if (!field || readOnly) return;
        if (field.executeCommand) {
            field.executeCommand("insert", symbol);
        } else {
            onChange(`${value}${symbol}`);
        }
    };

    return (
        <div className={`equation-editor${readOnly ? " equation-editor-readonly" : ""}`}>
            {!readOnly && (
                <div className="equation-ribbon">
                    {SYMBOL_CATEGORIES.map((category) => (
                        <details key={category.name}>
                            <summary>{category.name}</summary>
                            <div className="equation-symbol-grid">
                                {category.symbols.map((symbol) => (
                                    <button type="button" key={symbol} onClick={() => insertSymbol(symbol)} aria-label={`Insert ${symbol}`} title={symbol}>
                                        <span dangerouslySetInnerHTML={{ __html: katex.renderToString(symbol, { throwOnError: false }) }} />
                                    </button>
                                ))}
                            </div>
                        </details>
                    ))}
                </div>
            )}
            {!readOnly && (
                <>
                    <math-field
                        ref={fieldRef}
                        aria-label={label}
                        virtual-keyboard-mode="onfocus"
                        onInput={(event) => onChange(event.target.value)}
                    />
                    <label className="equation-source-label" htmlFor="equationSource">Editable LaTeX source</label>
                    <textarea
                        id="equationSource"
                        className="equation-source"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        rows={3}
                    />
                </>
            )}
            <div className={`equation-preview${readOnly ? " equation-preview-readonly" : ""}`} aria-label="Equation preview">
                <span ref={previewRef} />
            </div>
        </div>
    );
}

export default EquationEditor;
