export type Comment = {
  id: string;
  postId: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  text: string;
};
