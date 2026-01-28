export type ContentType = 'PAGE' | 'POST' | 'MEDIA';

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ContentConnection {
  items: Content[];
  nextToken?: string;
}

export interface ListContentByTypeData {
  listContentByType: ContentConnection;
}

export interface ListContentByTypeVars {
  type: ContentType;
  limit?: number;
  nextToken?: string;
}

export interface CreateContentInput {
  id: string;
  type: ContentType;
  title: string;
  content: string;
}

export interface UpdateContentInput {
  id: string;
  title: string;
  content: string;
}

export interface CreateContentData {
  createContent: Content;
}

export interface UpdateContentData {
  updateContent: Content;
}

export interface DeleteContentData {
  deleteContent: {
    id: string;
  };
}
