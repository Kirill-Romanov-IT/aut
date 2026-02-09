'use client';

export default function Home() {
  const testIntegration = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/health");
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error fetching health status:", error);
    }
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Hello from Next.js</h1>
      <p>This is a minimal starting point.</p>
      <button
        onClick={testIntegration}
        style={{
          padding: "10px 20px",
          fontSize: "16px",
          cursor: "pointer",
          marginTop: "20px"
        }}
      >
        Протестировать связку фронтенда и бэкэнда
      </button>
    </main>
  );
}
