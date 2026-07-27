"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_UPLOAD_BYTES, MAX_UPLOADS_PER_RUN, type UploadRow } from "@cc/shared";
import { ACCEPTED_FILE_EXTENSIONS } from "@/lib/intake-options";

interface PendingUpload {
  key: string;
  filename: string;
  progress: number;
  error?: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** PUTs the file to the Supabase Storage signed URL, reporting progress. */
function putWithProgress(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    xhr.send(body);
  });
}

export function UploadStep({
  runId,
  uploads,
  onUploadsChanged,
}: {
  runId: string;
  uploads: UploadRow[];
  onUploadsChanged: (uploads: UploadRow[]) => void;
}) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      setError(null);
      const room = MAX_UPLOADS_PER_RUN - uploads.length - pending.length;
      if (room <= 0) {
        setError(`You can attach up to ${MAX_UPLOADS_PER_RUN} files per run.`);
        return;
      }

      const accepted: File[] = [];
      for (const file of files.slice(0, room)) {
        const extension = `.${file.name.toLowerCase().split(".").pop()}`;
        if (!ACCEPTED_FILE_EXTENSIONS.includes(extension)) {
          setError(
            `"${file.name}" isn't a supported file type. Use ${ACCEPTED_FILE_EXTENSIONS.join(", ")}.`
          );
          continue;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(`"${file.name}" is larger than ${formatBytes(MAX_UPLOAD_BYTES)}.`);
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length === 0) return;

      const registered: {
        storage_path: string;
        filename: string;
        type: string;
        size_bytes: number;
      }[] = [];

      await Promise.all(
        accepted.map(async (file) => {
          const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
          setPending((prev) => [...prev, { key, filename: file.name, progress: 0 }]);
          try {
            const urlResponse = await fetch(`/api/runs/${runId}/upload-url`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: file.name, size_bytes: file.size }),
            });
            if (!urlResponse.ok) {
              const body = await urlResponse.json().catch(() => ({}));
              throw new Error(body.error ?? "Could not start the upload");
            }
            const { signed_url, storage_path, type } = await urlResponse.json();

            await putWithProgress(signed_url, file, (percent) => {
              setPending((prev) =>
                prev.map((p) => (p.key === key ? { ...p, progress: percent } : p))
              );
            });

            registered.push({
              storage_path,
              filename: file.name,
              type,
              size_bytes: file.size,
            });
            setPending((prev) => prev.filter((p) => p.key !== key));
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed";
            setPending((prev) =>
              prev.map((p) => (p.key === key ? { ...p, error: message } : p))
            );
          }
        })
      );

      if (registered.length > 0) {
        try {
          const response = await fetch(`/api/runs/${runId}/uploads`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploads: registered }),
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error ?? "Could not save your files");
          }
          const { uploads: saved } = (await response.json()) as { uploads: UploadRow[] };
          onUploadsChanged([...uploads, ...saved]);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not save your files");
        }
      }
    },
    [runId, uploads, pending.length, onUploadsChanged]
  );

  async function removeUpload(uploadId: string) {
    setError(null);
    const response = await fetch(`/api/runs/${runId}/uploads/${uploadId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not remove that file");
      return;
    }
    onUploadsChanged(uploads.filter((u) => u.id !== uploadId));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Add your discovery material</h2>
      <p className="mt-1 text-sm text-slate-600">
        Attach your call transcripts, notes, or any requirements document the
        prospect sent. We&apos;ll read them and pull out the details automatically.
        You can skip this if you only want to answer the questions yourself.
      </p>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void handleFiles(Array.from(event.dataTransfer.files));
        }}
        className={`mt-6 rounded-xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-white"
        }`}
      >
        <p className="text-sm text-slate-600">
          Drag files here, or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-blue-700 underline hover:text-blue-800"
          >
            browse your computer
          </button>
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Word documents, PDFs, plain text, and transcript files (
          {ACCEPTED_FILE_EXTENSIONS.join(", ")}) up to{" "}
          {formatBytes(MAX_UPLOAD_BYTES)} each.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
          className="sr-only"
          onChange={(event) => {
            void handleFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {uploads.length > 0 || pending.length > 0 ? (
        <ul className="mt-6 space-y-2">
          {uploads.map((upload) => (
            <li
              key={upload.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{upload.filename}</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(upload.size_bytes)}
                  {upload.status === "failed"
                    ? " · we couldn't read this file — try a different format"
                    : " · ready"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void removeUpload(upload.id)}
                className="ml-4 shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-xs hover:bg-slate-50"
              >
                Remove
              </button>
            </li>
          ))}
          {pending.map((item) => (
            <li
              key={item.key}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <div className="flex items-center justify-between">
                <p className="truncate font-medium">{item.filename}</p>
                <span className="ml-4 shrink-0 text-xs text-slate-500">
                  {item.error ? item.error : `${item.progress}%`}
                </span>
              </div>
              {!item.error ? (
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={item.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Uploading ${item.filename}`}
                >
                  <div
                    className="h-full rounded-full bg-blue-600 transition-[width]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
