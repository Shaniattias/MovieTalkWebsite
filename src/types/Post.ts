export type Post = {
  id: string;
  author: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  createdAt: string;
  title: string;
  text: string;
  imageUrl?: string;

  likesCount: number;
  commentsCount: number;
  liked?: boolean;
};
