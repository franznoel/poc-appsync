import React from 'react';
import './App.css';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsconfig from './aws-exports';
import ContentManager from './components/ContentManager';

Amplify.configure(awsconfig);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="App">
          <header className="App-header">
            <h1>AppSync POC Application</h1>
            <div className="user-info">
              <span>Logged in as: {user?.username}</span>
              <button onClick={signOut} className="sign-out-btn">Sign Out</button>
            </div>
          </header>
          <main className="App-main">
            <ContentManager />
          </main>
        </div>
      )}
    </Authenticator>
  );
}

export default App;
