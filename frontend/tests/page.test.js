import { render, screen } from '@testing-library/react'
import Home from '../app/page'

describe('Home Page', () => {
    it('renders the integration test button', () => {
        render(<Home />)
        const button = screen.getByText(/Протестировать связку фронтенда и бэкэнда/i)
        expect(button).toBeInTheDocument()
    })

    it('renders the main heading', () => {
        render(<Home />)
        const heading = screen.getByText(/Hello from Next.js/i)
        expect(heading).toBeInTheDocument()
    })
})
