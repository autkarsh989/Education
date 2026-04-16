import json
import shutil
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from vector_ingest_service import ingest_zip


BASE_DIR = Path(__file__).resolve().parent
HTML_FILE = BASE_DIR / "vector_ingest_local.html"


class LocalIngestHandler(BaseHTTPRequestHandler):
    def _json_response(self, data: dict, status: int = 200):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        if self.path != "/":
            self.send_error(404, "Not Found")
            return

        html = HTML_FILE.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)

    def do_POST(self):
        if self.path != "/vector-ingest/upload-zip":
            self.send_error(404, "Not Found")
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self._json_response({"detail": "Content-Type must be multipart/form-data"}, status=400)
            return

        try:
            import cgi

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": content_type,
                },
            )

            class_number = form.getvalue("class_number", "").strip()
            subject = form.getvalue("subject", "").strip()
            file_item = form["zip_file"] if "zip_file" in form else None

            if not class_number or not subject or file_item is None:
                self._json_response(
                    {"detail": "class_number, subject and zip_file are required"},
                    status=400,
                )
                return

            filename = Path(file_item.filename or "upload.zip").name
            if not filename.lower().endswith(".zip"):
                self._json_response({"detail": "Please upload a .zip file"}, status=400)
                return

            with tempfile.TemporaryDirectory() as tmp_dir:
                zip_path = Path(tmp_dir) / filename
                with zip_path.open("wb") as out:
                    shutil.copyfileobj(file_item.file, out)

                result = ingest_zip(
                    zip_path=zip_path,
                    class_number=class_number,
                    subject=subject,
                    zip_filename=filename,
                )

            self._json_response(result, status=200)

        except ValueError as exc:
            self._json_response({"detail": str(exc)}, status=400)
        except Exception as exc:
            self._json_response({"detail": f"Internal error: {exc}"}, status=500)


def run():
    host = "127.0.0.1"
    port = 8091
    server = ThreadingHTTPServer((host, port), LocalIngestHandler)
    print(f"Local UI running at http://{host}:{port}")
    print("No uvicorn required. Press Ctrl+C to stop.")
    server.serve_forever()


if __name__ == "__main__":
    run()
