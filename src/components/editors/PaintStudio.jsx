import { useEffect, useRef, useState } from "react";
import { Circle, Ellipse, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";

const COLORS = ["#111827", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#2563eb", "#8b5cf6", "#ec4899", "#ffffff"];
const MAX_IMAGE_FILE_SIZE = 512 * 1024;
const MAX_QUESTION_IMAGE_SIZE = 1024 * 1024;

function PaintStudio({ pages = [], onChange, readOnly = false, allowImageUpload = false }) {
    const containerRef = useRef(null);
    const uploadRef = useRef(null);
    const imageCache = useRef(new Map());
    const [pageIndex, setPageIndex] = useState(0);
    const [tool, setTool] = useState("pencil");
    const [color, setColor] = useState("#111827");
    const [size, setSize] = useState(4);
    const [zoom, setZoom] = useState(1);
    const [drawing, setDrawing] = useState(false);
    const [draft, setDraft] = useState(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
    const [history, setHistory] = useState({});
    const [redo, setRedo] = useState({});
    const [loadedImages, setLoadedImages] = useState({});
    const [uploadError, setUploadError] = useState("");

    useEffect(() => {
        const updateSize = () => {
            const width = containerRef.current?.clientWidth || 800;
            setDimensions({ width: Math.max(280, width), height: 500 });
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        const sources = [...new Set(pages.flatMap((page) => (
            (page.objects || [])
                .filter((object) => object.type === "image" && typeof object.src === "string")
                .map((object) => object.src)
        )))];
        sources.forEach((source) => {
            if (imageCache.current.has(source)) return;
            const image = new window.Image();
            image.onload = () => {
                imageCache.current.set(source, image);
                setLoadedImages((current) => ({ ...current, [source]: image }));
            };
            image.onerror = () => setUploadError("A saved image could not be displayed.");
            image.src = source;
        });
    }, [pages]);

    const activePage = pages[pageIndex] || { width: dimensions.width, height: dimensions.height, objects: [] };
    const objects = activePage.objects || [];

    const commitObjects = (nextObjects) => {
        if (readOnly) return;
        setHistory((current) => ({ ...current, [pageIndex]: [...(current[pageIndex] || []), objects] }));
        setRedo((current) => ({ ...current, [pageIndex]: [] }));
        const nextPages = [...pages];
        nextPages[pageIndex] = { width: dimensions.width, height: dimensions.height, objects: nextObjects };
        onChange(nextPages);
    };

    const handleImageSelection = (event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setUploadError("Choose an image file.");
            return;
        }
        if (file.size > MAX_IMAGE_FILE_SIZE) {
            setUploadError("Images must be 512 KB or smaller.");
            return;
        }
        const existingImageBytes = pages.reduce((total, page) => total + (page.objects || [])
            .filter((object) => object.type === "image" && typeof object.src === "string")
            .reduce((pageTotal, object) => pageTotal + Math.ceil(object.src.length * 3 / 4), 0), 0);
        if (existingImageBytes + file.size > MAX_QUESTION_IMAGE_SIZE) {
            setUploadError("Images in a question cannot exceed 1 MB in total.");
            return;
        }

        const reader = new FileReader();
        reader.onerror = () => setUploadError("The selected image could not be read.");
        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setUploadError("The selected image could not be read.");
                return;
            }
            const image = new window.Image();
            image.onerror = () => setUploadError("The selected file is not a supported image.");
            image.onload = () => {
                const scale = Math.min(1, (dimensions.width - 48) / image.naturalWidth, 400 / image.naturalHeight);
                const source = reader.result;
                imageCache.current.set(source, image);
                setLoadedImages((current) => ({ ...current, [source]: image }));
                setUploadError("");
                commitObjects([...objects, {
                    type: "image",
                    src: source,
                    x: 24,
                    y: 24,
                    width: image.naturalWidth * scale,
                    height: image.naturalHeight * scale
                }]);
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const pointerPosition = (event) => {
        const stage = event.target.getStage();
        const position = stage.getPointerPosition();
        return { x: position.x / zoom, y: position.y / zoom };
    };

    const handlePointerDown = (event) => {
        if (readOnly) return;
        const point = pointerPosition(event);
        setDrawing(true);
        if (tool === "pencil" || tool === "brush" || tool === "eraser") {
            setDraft({ type: "line", tool, points: [point.x, point.y], stroke: tool === "eraser" ? "#ffffff" : color, strokeWidth: tool === "eraser" ? size * 3 : tool === "brush" ? size * 2 : size });
        } else if (tool === "line") {
            setDraft({ type: "line", points: [point.x, point.y, point.x, point.y], stroke: color, strokeWidth: size });
        } else if (tool === "rectangle") {
            setDraft({ type: "rect", x: point.x, y: point.y, width: 0, height: 0, stroke: color, strokeWidth: size, fill: "transparent" });
        } else if (tool === "circle" || tool === "ellipse") {
            setDraft({ type: tool, x: point.x, y: point.y, radiusX: 0, radiusY: 0, radius: 0, stroke: color, strokeWidth: size, fill: "transparent" });
        } else if (tool === "text") {
            const text = window.prompt("Enter text");
            if (text) commitObjects([...objects, { type: "text", x: point.x, y: point.y, text, fill: color, fontSize: Math.max(12, size * 4) }]);
        }
    };

    const handlePointerMove = (event) => {
        if (!drawing || !draft || readOnly) return;
        const point = pointerPosition(event);
        if (draft.type === "line" && (tool === "pencil" || tool === "brush" || tool === "eraser")) {
            setDraft((current) => ({ ...current, points: [...current.points, point.x, point.y] }));
        } else if (draft.type === "line") {
            setDraft((current) => ({ ...current, points: [current.points[0], current.points[1], point.x, point.y] }));
        } else if (draft.type === "rect") {
            setDraft((current) => ({
                ...current,
                width: point.x - current.x,
                height: point.y - current.y
            }));
        } else if (draft.type === "circle") {
            setDraft((current) => ({ ...current, radius: Math.hypot(point.x - current.x, point.y - current.y) }));
        } else if (draft.type === "ellipse") {
            setDraft((current) => ({
                ...current,
                radiusX: Math.abs(point.x - current.x),
                radiusY: Math.abs(point.y - current.y)
            }));
        }
    };

    const handlePointerUp = () => {
        if (!drawing || !draft || readOnly) return;
        setDrawing(false);
        commitObjects([...objects, draft]);
        setDraft(null);
    };

    const undo = () => {
        if (readOnly || !history[pageIndex]?.length) return;
        const previous = history[pageIndex][history[pageIndex].length - 1];
        setHistory((current) => ({ ...current, [pageIndex]: current[pageIndex].slice(0, -1) }));
        setRedo((current) => ({ ...current, [pageIndex]: [...(current[pageIndex] || []), objects] }));
        const nextPages = [...pages];
        nextPages[pageIndex] = { ...activePage, objects: previous };
        onChange(nextPages);
    };

    const redoAction = () => {
        if (readOnly || !redo[pageIndex]?.length) return;
        const next = redo[pageIndex][redo[pageIndex].length - 1];
        setRedo((current) => ({ ...current, [pageIndex]: current[pageIndex].slice(0, -1) }));
        setHistory((current) => ({ ...current, [pageIndex]: [...(current[pageIndex] || []), objects] }));
        const nextPages = [...pages];
        nextPages[pageIndex] = { ...activePage, objects: next };
        onChange(nextPages);
    };

    const addPage = () => {
        if (readOnly || pages.length >= 20) return;
        const nextPages = [...pages, { width: dimensions.width, height: dimensions.height, objects: [] }];
        onChange(nextPages);
        setPageIndex(nextPages.length - 1);
    };

    const deletePage = () => {
        if (readOnly || pages.length <= 1) return;
        const nextPages = pages.filter((_page, index) => index !== pageIndex);
        onChange(nextPages);
        setPageIndex(Math.max(0, pageIndex - 1));
    };

    const clearPage = () => commitObjects([]);

    const renderObject = (object, index) => {
        const key = `${object.type}-${index}`;
        if (object.type === "line") return <Line key={key} {...object} tension={0.45} lineCap="round" lineJoin="round" />;
        if (object.type === "image") {
            const image = loadedImages[object.src];
            return image ? <KonvaImage key={key} {...object} image={image} /> : null;
        }
        if (object.type === "rect") return <Rect key={key} {...object} />;
        if (object.type === "circle") return <Circle key={key} {...object} />;
        if (object.type === "ellipse") return <Ellipse key={key} {...object} />;
        if (object.type === "text") return <Text key={key} {...object} />;
        return null;
    };

    const displayPages = pages.length ? pages : [{ width: dimensions.width, height: dimensions.height, objects: [] }];

    return (
        <div className={`paint-studio${readOnly ? " paint-studio-readonly" : ""}`} ref={containerRef}>
            {!readOnly && (
                <>
                    <div className="paint-toolbar" role="toolbar" aria-label="Drawing tools">
                        {["pencil", "brush", "eraser", "line", "rectangle", "circle", "ellipse", "text"].map((item) => (
                            <button type="button" key={item} className={tool === item ? "active" : ""} onClick={() => setTool(item)}>
                                {item}
                            </button>
                        ))}
                        {allowImageUpload && (
                            <>
                                <button type="button" onClick={() => uploadRef.current?.click()}>Add image</button>
                                <input
                                    ref={uploadRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelection}
                                    hidden
                                />
                            </>
                        )}
                        <button type="button" onClick={undo} disabled={!history[pageIndex]?.length}>Undo</button>
                        <button type="button" onClick={redoAction} disabled={!redo[pageIndex]?.length}>Redo</button>
                    </div>
                    <div className="paint-settings">
                        <label>Size <input type="range" min="1" max="24" value={size} onChange={(event) => setSize(Number(event.target.value))} /></label>
                        <label>Zoom <select value={zoom} onChange={(event) => setZoom(Number(event.target.value))}><option value={0.75}>75%</option><option value={1}>100%</option><option value={1.25}>125%</option><option value={1.5}>150%</option></select></label>
                        <div className="paint-colors" aria-label="Color palette">
                            {COLORS.map((item) => (
                                <button type="button" key={item} className={color === item ? "active" : ""} style={{ background: item }} onClick={() => setColor(item)} aria-label={`Use ${item}`} />
                            ))}
                            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Custom color" />
                        </div>
                    </div>
                    {uploadError && <p className="paint-upload-error" role="alert">{uploadError}</p>}
                </>
            )}
            <div className="paint-workspace">
                <Stage
                    width={dimensions.width}
                    height={500}
                    scaleX={zoom}
                    scaleY={zoom}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ touchAction: "none" }}
                >
                    <Layer>
                        <Rect x={0} y={0} width={dimensions.width} height={500} fill="#ffffff" />
                        {[...(displayPages[pageIndex].objects || []), ...(draft ? [draft] : [])].map(renderObject)}
                    </Layer>
                </Stage>
            </div>
            {!readOnly && (
                <div className="paint-status">
                    <button type="button" onClick={clearPage}>Clear</button>
                    <button type="button" onClick={() => setPageIndex((index) => Math.max(0, index - 1))} disabled={pageIndex === 0}>Previous</button>
                    <span>Page {pageIndex + 1} / {displayPages.length}</span>
                    <button type="button" onClick={() => setPageIndex((index) => Math.min(displayPages.length - 1, index + 1))} disabled={pageIndex >= displayPages.length - 1}>Next</button>
                    <button type="button" onClick={addPage} disabled={displayPages.length >= 20}>Add page</button>
                    <button type="button" onClick={deletePage} disabled={displayPages.length <= 1}>Delete page</button>
                </div>
            )}
        </div>
    );
}

export default PaintStudio;
