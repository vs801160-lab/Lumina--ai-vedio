import { useState } from "react";

function App() {
  // ===== STATES =====
  const [prompt, setPrompt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ===== GENERATE VIDEO FUNCTION =====
  const generateVideo = async () => {
    if (!prompt.trim()) {
      alert("Please enter a prompt");
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const response = await fetch(
        "https://YOUR-BACKEND-URL/generate-video",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        }
      );

      const data = await response.json();

      if (data.videoUrl) {
        setVideoUrl(data.videoUrl);
      } else {
        setError("Video generation failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }

    setLoading(false);
  };

  // ===== UI =====
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
        color: "#fff",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#020617",
          padding: "20px",
          borderRadius: "12px",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "15px" }}>
          🎬 Lumina AI Video
        </h2>

        <input
          type="text"
          placeholder="Describe your video..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            marginBottom: "10px",
          }}
        />

        <button
          onClick={generateVideo}
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "none",
            background: loading ? "#475569" : "#2563eb",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>

        {loading && (
          <p style={{ marginTop: "10px", textAlign: "center" }}>
            ⏳ AI is creating your video…
          </p>
        )}

        {error && (
          <p style={{ marginTop: "10px", color: "red", textAlign: "center" }}>
            {error}
          </p>
        )}

        {videoUrl && (
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            style={{
              width: "100%",
              marginTop: "15px",
              borderRadius: "10px",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default App;
