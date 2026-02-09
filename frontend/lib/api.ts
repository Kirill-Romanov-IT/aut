const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function login(username: string, password: string): Promise<any> {
    const response = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            username,
            password,
        }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Login failed")
    }

    return response.json()
}

export async function register(
    username: string,
    email: string,
    password: string
): Promise<any> {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            username,
            email,
            password,
        }),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Registration failed")
    }

    return response.json()
}
