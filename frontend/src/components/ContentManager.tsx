import React, { useState, useEffect } from 'react';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import { ApolloProvider, useQuery, useMutation } from '@apollo/client/react';
import { createAuthLink, AuthOptions } from 'aws-appsync-auth-link';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { ApolloLink } from '@apollo/client';
import { fetchAuthSession } from 'aws-amplify/auth';
import awsconfig from '../aws-exports';
import {
  Content,
  ContentType,
  ListContentByTypeData,
  ListContentByTypeVars,
  CreateContentData,
  UpdateContentData,
  DeleteContentData,
} from '../types/graphql';
import './ContentManager.css';

// GraphQL Queries and Mutations
const LIST_CONTENT_BY_TYPE = gql`
  query ListContentByType($type: ContentType!, $limit: Int, $nextToken: String) {
    listContentByType(type: $type, limit: $limit, nextToken: $nextToken) {
      items {
        id
        type
        title
        content
        createdAt
        updatedAt
        createdBy
      }
      nextToken
    }
  }
`;

const CREATE_CONTENT = gql`
  mutation CreateContent($input: CreateContentInput!) {
    createContent(input: $input) {
      id
      type
      title
      content
      createdAt
      updatedAt
      createdBy
    }
  }
`;

const UPDATE_CONTENT = gql`
  mutation UpdateContent($input: UpdateContentInput!) {
    updateContent(input: $input) {
      id
      type
      title
      content
      createdAt
      updatedAt
      createdBy
    }
  }
`;

const DELETE_CONTENT = gql`
  mutation DeleteContent($id: ID!) {
    deleteContent(id: $id) {
      id
    }
  }
`;

// Create Apollo Client
const createApolloClient = async () => {
  const url = awsconfig.aws_appsync_graphqlEndpoint;
  const region = awsconfig.aws_appsync_region;

  const auth: AuthOptions = {
    type: 'AMAZON_COGNITO_USER_POOLS',
    jwtToken: async () => {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || '';
    },
  };

  const link = ApolloLink.from([
    createAuthLink({ url, region, auth }),
    createSubscriptionHandshakeLink({ url, region, auth }),
  ]);

  return new ApolloClient({
    link,
    cache: new InMemoryCache(),
  });
};

// Content List Component
function ContentList() {
  const [selectedType, setSelectedType] = useState<ContentType>('PAGE');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [isCreating, setIsCreating] = useState(false);

  const { data, loading, error, refetch } = useQuery<ListContentByTypeData, ListContentByTypeVars>(
    LIST_CONTENT_BY_TYPE,
    {
      variables: { type: selectedType, limit: 20 },
    }
  );

  const [createContent] = useMutation<CreateContentData>(CREATE_CONTENT);
  const [updateContent] = useMutation<UpdateContentData>(UPDATE_CONTENT);
  const [deleteContent] = useMutation<DeleteContentData>(DELETE_CONTENT);

  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await createContent({
        variables: {
          input: {
            id: `${selectedType}-${Date.now()}`,
            type: selectedType,
            title: formData.title,
            content: formData.content,
          },
        },
      });
      setFormData({ title: '', content: '' });
      setIsCreating(false);
      refetch();
    } catch (err) {
      console.error('Error creating content:', err);
      alert('Error creating content');
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.title || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    try {
      await updateContent({
        variables: {
          input: {
            id,
            title: formData.title,
            content: formData.content,
          },
        },
      });
      setEditingId(null);
      setFormData({ title: '', content: '' });
      refetch();
    } catch (err) {
      console.error('Error updating content:', err);
      alert('Error updating content');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await deleteContent({
        variables: { id },
      });
      refetch();
    } catch (err) {
      console.error('Error deleting content:', err);
      alert('Error deleting content');
    }
  };

  const startEdit = (item: Content) => {
    setEditingId(item.id);
    setFormData({ title: item.title, content: item.content });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ title: '', content: '' });
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error.message}</div>;

  const items = data?.listContentByType?.items || [];

  return (
    <div className="content-manager">
      <div className="controls">
        <div className="type-selector">
          <button
            className={selectedType === 'PAGE' ? 'active' : ''}
            onClick={() => setSelectedType('PAGE')}
          >
            Pages
          </button>
          <button
            className={selectedType === 'POST' ? 'active' : ''}
            onClick={() => setSelectedType('POST')}
          >
            Posts
          </button>
          <button
            className={selectedType === 'MEDIA' ? 'active' : ''}
            onClick={() => setSelectedType('MEDIA')}
          >
            Media
          </button>
        </div>
        <button className="create-btn" onClick={() => setIsCreating(true)}>
          Create New {selectedType}
        </button>
      </div>

      {isCreating && (
        <div className="form-container">
          <h3>Create New {selectedType}</h3>
          <input
            type="text"
            placeholder="Title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <textarea
            placeholder="Content"
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          />
          <div className="form-actions">
            <button onClick={handleCreate}>Create</button>
            <button onClick={() => { setIsCreating(false); setFormData({ title: '', content: '' }); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="content-list">
        {items.length === 0 ? (
          <div className="empty-state">No {selectedType.toLowerCase()}s found. Create one to get started!</div>
        ) : (
          items.map((item: Content) => (
            <div key={item.id} className="content-item">
              {editingId === item.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                  <div className="form-actions">
                    <button onClick={() => handleUpdate(item.id)}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                  <div className="item-meta">
                    <span>Created by: {item.createdBy}</span>
                    <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="item-actions">
                    <button onClick={() => startEdit(item)}>Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="delete-btn">
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main Component with Apollo Provider
export default function ContentManager() {
  const [client, setClient] = useState<typeof ApolloClient.prototype | null>(null);

  useEffect(() => {
    createApolloClient().then(setClient);
  }, []);

  if (!client) {
    return <div className="loading">Initializing Apollo Client...</div>;
  }

  return (
    <ApolloProvider client={client}>
      <ContentList />
    </ApolloProvider>
  );
}
