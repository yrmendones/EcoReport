import { useEffect, useMemo, useRef } from "react";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";

const Quill = ReactQuill.Quill;

// Register a custom <video> blot once — Quill's default video is an iframe embed,
// which doesn't work for direct MP4 URLs from Cloudinary.
let videoBlotRegistered = false;
if (!videoBlotRegistered && Quill) {
  const BlockEmbed = Quill.import("blots/block/embed");
  class VideoBlot extends BlockEmbed {
    static create(url) {
      const node = super.create();
      node.setAttribute("controls", "controls");
      node.setAttribute("preload", "metadata");
      node.setAttribute("src", url);
      node.setAttribute("style", "max-width:100%;border-radius:8px;");
      return node;
    }
    static value(node) {
      return node.getAttribute("src");
    }
  }
  VideoBlot.blotName = "videoCustom";
  VideoBlot.tagName = "video";
  Quill.register(VideoBlot);
  videoBlotRegistered = true;
}

const API_BASE = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter description...",
}) {
    const quillRef = useRef(null);

  // ─── Add hover tooltips to Quill toolbar buttons ───
  useEffect(() => {
    // Quill renders the toolbar asynchronously — wait a tick
    const timer = setTimeout(() => {
      const editor = quillRef.current?.getEditor?.();
      if (!editor) return;
      const toolbar = editor.container.parentElement.querySelector(".ql-toolbar");
      if (!toolbar) return;

      const titles = {
        "ql-bold": "Bold (Ctrl+B)",
        "ql-italic": "Italic (Ctrl+I)",
        "ql-underline": "Underline (Ctrl+U)",
        "ql-strike": "Strikethrough",
        "ql-blockquote": "Blockquote",
        "ql-code-block": "Code Block",
        "ql-link": "Insert Link (URL)",
        "ql-image": "Upload Image",
        "ql-video": "Upload Video",
        "ql-clean": "Clear Formatting",
      };

      // Simple buttons
      Object.entries(titles).forEach(([cls, title]) => {
        toolbar.querySelectorAll(`.${cls}`).forEach((btn) => {
          if (!btn.getAttribute("title")) btn.setAttribute("title", title);
        });
      });

      // List buttons (ordered vs bullet)
      toolbar.querySelectorAll(".ql-list").forEach((btn) => {
        const val = btn.getAttribute("value");
        btn.setAttribute(
          "title",
          val === "ordered" ? "Numbered List" : "Bullet List"
        );
      });

      // Header dropdown
      const headerPicker = toolbar.querySelector(".ql-header");
      if (headerPicker) {
        headerPicker.setAttribute("title", "Text Style");
        const itemTitles = {
          "1": "Heading 1",
          "2": "Heading 2",
          "3": "Heading 3",
          "": "Normal Text",
        };
        headerPicker.querySelectorAll(".ql-picker-item").forEach((item) => {
          const val = item.getAttribute("data-value") || "";
          item.setAttribute("title", itemTitles[val] || "Text Style");
        });
        headerPicker.querySelectorAll(".ql-picker-label").forEach((lbl) => {
          lbl.setAttribute("title", "Text Style");
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append("files", file);
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: fd,
    });

    // Safe JSON parse - server might return empty body on network errors
    let data = {};
    try {
      data = await res.json();
    } catch {
      data = { error: `Server error (${res.status})` };
    }

    if (!res.ok) {
      throw new Error(data.error || `Upload failed (HTTP ${res.status}).`);
    }
    const url = data.files?.[0]?.url;
    if (!url) throw new Error("No URL returned from upload.");
    return url;
  };

  const imageHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadFile(file);
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, "image", url, "user");
        quill.setSelection(range.index + 1);
      } catch (err) {
        alert("Image upload failed: " + err.message);
      }
    };
  };

  const handleChange = (html) => {
    const normalized = html.replace(
      /href=(["'])([^"']+)\1/gi,
      (match, quote, url) => {
        const t = url.trim();
        if (!t) return match;
        if (/^(https?:|mailto:|tel:|#)/i.test(t)) return match;
        if (t.startsWith("//")) return `href=${quote}https:${t}${quote}`;
        return `href=${quote}https://${t.replace(/^\/+/, "")}${quote}`;
      }
    );
    onChange(normalized);
  };

  const videoHandler = () => {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "video/*");
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const url = await uploadFile(file);
        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, "videoCustom", url, "user");
        quill.setSelection(range.index + 1);
      } catch (err) {
        alert("Video upload failed: " + err.message);
      }
    };
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link"],
          ["image", "video"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
          video: videoHandler,
        },
      },
    }),
    []
  );

  return (
    <div className="rich-text-editor">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={handleChange}
        modules={modules}
        placeholder={placeholder}
      />
      <style>{`
        .rich-text-editor .ql-toolbar {
          border: 1px solid #ccc;
          border-top-left-radius: 4px;
          border-top-right-radius: 4px;
          background: #f8faf8;
          padding: 6px;
        }
        .rich-text-editor .ql-toolbar .ql-stroke { stroke: #0B5D2A; }
        .rich-text-editor .ql-toolbar .ql-fill { fill: #0B5D2A; }
        .rich-text-editor .ql-toolbar .ql-picker { color: #0B5D2A; }
        .rich-text-editor .ql-toolbar button:hover,
        .rich-text-editor .ql-toolbar button.ql-active,
        .rich-text-editor .ql-toolbar .ql-picker-label:hover,
        .rich-text-editor .ql-toolbar .ql-picker-label.ql-active {
          background: #e5f5e9;
          border-radius: 3px;
        }
        .rich-text-editor .ql-container {
          border: 1px solid #ccc;
          border-top: none;
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
          background: #fff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 13px;
          min-height: 220px;
        }
        .rich-text-editor .ql-editor {
          min-height: 200px;
          line-height: 1.6;
          color: #222;
        }
        /* Override the modal's ".modal-content h3 { color: green }" rule —
           this keeps Quill's heading formatting neutral (black) inside the editor */
        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          color: #222 !important;
          font-weight: 800;
          margin: 12px 0 8px 0;
          line-height: 1.3;
        }
        .rich-text-editor .ql-editor h1 { font-size: 22px; }
        .rich-text-editor .ql-editor h2 { font-size: 18px; }
        .rich-text-editor .ql-editor h3 { font-size: 16px; }
        .rich-text-editor .ql-editor img,
        .rich-text-editor .ql-editor video {
          max-width: 100%;
          border-radius: 8px;
          margin: 8px 0;
        }
        .rich-text-editor .ql-editor video {
          display: block;
        }
      `}</style>
    </div>
  );
}