import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '../components/login-form'
import { login } from '../lib/api'

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

jest.mock('../lib/api', () => ({
    login: jest.fn(),
}))

describe('LoginForm', () => {
    it('renders login form items', () => {
        render(<LoginForm />)
        expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^Login$/i })).toBeInTheDocument()
    })

    it('submits the form successfully', async () => {
        login.mockResolvedValue({ access_token: 'fake-token' })
        render(<LoginForm />)

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /^Login$/i }))

        await waitFor(() => {
            expect(login).toHaveBeenCalledWith('testuser', 'password123')
        })
    })

    it('shows error message on failure', async () => {
        login.mockRejectedValue(new Error('Invalid credentials'))
        render(<LoginForm />)

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpassword' } })
        fireEvent.click(screen.getByRole('button', { name: /^Login$/i }))

        await waitFor(() => {
            expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
        })
    })
})
