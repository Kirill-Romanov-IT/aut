const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function login(username, password) {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('password', password);

    const response = await fetch(`${API_URL}/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
    }

    return response.json();
}

export async function register(username, email, password) {
    const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
    }

    return response.json();
}

export async function getMe(token) {
    const response = await fetch(`${API_URL}/users/me`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user info');
    }

    return response.json();
}

export async function uploadCSV(file, token) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload-csv`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'CSV upload failed');
    }

    return response.json();
}

export async function getClients(token) {
    const response = await fetch(`${API_URL}/clients`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        let detail = 'Failed to fetch clients';
        try {
            const error = await response.json();
            detail = error.detail || detail;
        } catch (e) {
            detail = `${detail} (Status: ${response.status})`;
        }
        throw new Error(detail);
    }

    return response.json();
}
