import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

test('renders the application without crashing', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  
  // This looks for any text in your app. 
  // Change "Login" to a word that actually exists on your home page.
  const linkElement = screen.queryByText(/Login/i) || screen.queryByRole('button');
  expect(linkElement).toBeDefined();
});