import { render, screen } from '@testing-library/react'
import Home from '../app/page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
    }),
}))

describe('Home Page', () => {
    it('renders the login form heading', () => {
        render(<Home />)
        const element = screen.getByText(/Acme Inc./i)
        expect(element).toBeInTheDocument()
    })

    it('renders the login form', () => {
        render(<Home />)
        // Login form has a "Login" button and a "Login with Google" button
        const loginButtons = screen.getAllByRole('button', { name: /Login/i })
        expect(loginButtons.length).toBeGreaterThanOrEqual(1)
        expect(screen.getByRole('button', { name: /^Login$/i })).toBeInTheDocument()
    })
})
