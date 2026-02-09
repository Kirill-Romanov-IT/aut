import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterForm } from '../components/register-form'
import { register } from '../lib/api'

// Mock dependencies
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

jest.mock('../lib/api', () => ({
    register: jest.fn(),
}))

describe('RegisterForm', () => {
    it('renders register form items', () => {
        render(<RegisterForm />)
        expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Sign up/i })).toBeInTheDocument()
    })

    it('submits the form successfully', async () => {
        register.mockResolvedValue({ message: 'Success' })
        render(<RegisterForm />)

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /Sign up/i }))

        await waitFor(() => {
            expect(register).toHaveBeenCalledWith('testuser', 'test@example.com', 'password123')
        })
    })

    it('shows error message on failure', async () => {
        register.mockRejectedValue(new Error('User already exists'))
        render(<RegisterForm />)

        fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'testuser' } })
        fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@example.com' } })
        fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password123' } })
        fireEvent.click(screen.getByRole('button', { name: /Sign up/i }))

        await waitFor(() => {
            expect(screen.getByText(/User already exists/i)).toBeInTheDocument()
        })
    })
})
