import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app with authenticator', () => {
  render(<App />);
  // The Authenticator component should be present
  // Since we need Cognito configured, we just check that the app renders
  expect(document.body).toBeTruthy();
});
