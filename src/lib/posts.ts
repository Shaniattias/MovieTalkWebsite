import api from "./api";
import type { Post } from "../types/Post";

// ─── Public input/output types ───────────────────────────────────────────────

/** Fields required when creating a new post */
export type CreatePostInput = {
  title: string;
  text: string;
  imageFile?: File;
};

/** Fields that can be changed when editing an existing post */
export type UpdatePostInput = {
  title: string;
  text: string;
  imageFile?: File;
};

/** Re-export so pages only need one import */
export type { Post };

// ─── Private: minimal user shape ─────────────────────────────────────────────

type CurrentUser = {
  email: string;
  name?: string;
  avatar?: string;
  profileImage?: string;
};

// ─── Private: storage helpers ────────────────────────────────────────────────

const STORAGE_KEY = "movietalk_posts";
const API_BASE_URL_RAW = (import.meta.env.VITE_API_URL ?? "http://localhost:5001/api").replace(/\/$/, "");
const API_BASE_URL = API_BASE_URL_RAW.endsWith("/api") ? API_BASE_URL_RAW : `${API_BASE_URL_RAW}/api`;

function toAbsoluteMediaUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("data:")) {
    return pathOrUrl;
  }

  try {
    return `${new URL(API_BASE_URL).origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
  } catch {
    return pathOrUrl;
  }
}

function getAccessToken(): string | null {
  return localStorage.getItem("movietalk_token");
}

type BackendPost = {
  _id: string;
  title: string;
  text: string;
  imageUrl?: string;
  likesCount?: number;
  commentsCount?: number;
  createdAt: string;
  author:
    | string
    | {
      _id?: string;
      id?: string;
      username?: string;
      email?: string;
      profileImage?: string;
      avatarUrl?: string;
    };
};

function mapBackendPost(post: BackendPost, fallbackAuthor?: CurrentUser): Post {
  const authorObj = typeof post.author === "object" && post.author !== null ? post.author : undefined;
  const authorEmail = authorObj?.email || fallbackAuthor?.email || "unknown@example.com";

  return {
    id: post._id,
    author: {
      id: authorObj?._id || authorObj?.id || `u-${authorEmail}`,
      username: authorObj?.username || fallbackAuthor?.name || authorEmail.split("@")[0],
      avatarUrl: toAbsoluteMediaUrl(authorObj?.profileImage || authorObj?.avatarUrl || fallbackAuthor?.avatar || fallbackAuthor?.profileImage),
      email: authorEmail,
    },
    createdAt: new Date(post.createdAt).toLocaleString(),
    title: post.title,
    text: post.text,
    imageUrl: toAbsoluteMediaUrl(post.imageUrl),
    likesCount: post.likesCount ?? 0,
    commentsCount: post.commentsCount ?? 0,
    liked: false,
  };
}

/**
 * Shape of posts that may exist in localStorage from before author.email was
 * added; used only during migration on first read.
 */
type StoredLegacyShape = {
  id: string;
  author?:
    | string
    | { id: string; username: string; avatarUrl?: string; email?: string };
  authorEmail?: string;
  createdAt: string;
  title: string;
  text: string;
  poster?: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  liked?: boolean;
};

function normalizeLegacy(raw: StoredLegacyShape, index: number): Post {
  if (raw.author !== null && typeof raw.author === "object") {
    return {
      id: raw.id,
      author: {
        id: raw.author.id,
        username: raw.author.username,
        avatarUrl: raw.author.avatarUrl,
        email: raw.author.email ?? raw.authorEmail ?? "unknown@example.com",
      },
      createdAt: raw.createdAt,
      title: raw.title,
      text: raw.text,
      imageUrl: raw.imageUrl ?? raw.poster,
      likesCount: raw.likesCount,
      commentsCount: raw.commentsCount,
      liked: raw.liked,
    };
  }

  const username = typeof raw.author === "string" ? raw.author : "Unknown User";
  return {
    id: raw.id,
    author: {
      id: `legacy-${index}`,
      username,
      email: raw.authorEmail ?? "unknown@example.com",
    },
    createdAt: raw.createdAt,
    title: raw.title,
    text: raw.text,
    imageUrl: raw.imageUrl ?? raw.poster,
    likesCount: raw.likesCount,
    commentsCount: raw.commentsCount,
    liked: raw.liked,
  };
}

function loadFromStorage(): Post[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredLegacyShape[];
    return parsed.map(normalizeLegacy);
  } catch {
    return [];
  }
}

function saveToStorage(posts: Post[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function syncCurrentUserAuthorData(currentUser: CurrentUser | null): Post[] {
  if (!currentUser) return loadFromStorage();

  const posts = loadFromStorage();
  const nextUsername = currentUser.name || currentUser.email.split("@")[0];
  const nextAvatar = currentUser.avatar || currentUser.profileImage;

  let changed = false;
  const synced = posts.map((post) => {
    if (post.author.email !== currentUser.email) return post;

    const needsUsernameUpdate = post.author.username !== nextUsername;
    const needsAvatarUpdate = post.author.avatarUrl !== nextAvatar;

    if (!needsUsernameUpdate && !needsAvatarUpdate) return post;
    changed = true;

    return {
      ...post,
      author: {
        ...post.author,
        username: nextUsername,
        avatarUrl: nextAvatar,
      },
    };
  });

  if (changed) {
    saveToStorage(synced);
    return synced;
  }

  return posts;
}

// ─── Private: seed data ──────────────────────────────────────────────────────

const SEED_COMMUNITY_POSTS: Post[] = [
  {
    id: "2",
    author: { id: "u-ruby", username: "Ruby Collins", email: "ruby@example.com" },
    createdAt: "Yesterday",
    title: "Underrated sci-fi movies (2000-2010)",
    text: "I am building a watchlist. Send recommendations!",
    likesCount: 57,
    commentsCount: 12,
    liked: false,
  },
  {
    id: "3",
    author: { id: "u-aiya", username: "Aiya Morgan", email: "aiya@example.com" },
    createdAt: "3 days ago",
    title: "Comfort movies for a rainy night",
    text: "My pick: About Time. What is yours?",
    likesCount: 92,
    commentsCount: 19,
    liked: false,
  },
];

/**
 * Ensures the store is populated with baseline community posts.
 * Called internally by getAllPosts.
 */
function ensureSeed(): Post[] {
  const existing = loadFromStorage();

  if (existing.length === 0) {
    const seed = SEED_COMMUNITY_POSTS;
    saveToStorage(seed);
    return seed;
  }

  return existing;
}

// ─── Public API ──────────────────────────────────────────────────────────────
// Each function maps 1-to-1 to a future REST endpoint.
// Replacing localStorage with fetch() only requires changes in this file.

/**
 * GET /posts
 * Returns all posts, initialising baseline seed data if needed.
 */
export function getAllPosts(currentUser?: CurrentUser | null): Post[] {
  ensureSeed();
  return syncCurrentUserAuthorData(currentUser ?? null);
}

/**
 * GET /posts/:id
 * Returns a single post by id, or null if not found.
 */
export function getPostById(id: string): Post | null {
  return loadFromStorage().find((p) => p.id === id) ?? null;
}

export async function createPostAsync(input: CreatePostInput, author: CurrentUser): Promise<Post> {
  if (!getAccessToken()) {
    throw new Error("You must be logged in to create a post.");
  }

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("text", input.text);
  if (input.imageFile) {
    formData.append("image", input.imageFile);
  }

  const response = await api.post("/posts", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const backendPost = response.data as BackendPost;
  const createdPost = mapBackendPost(backendPost, author);
  const existing = loadFromStorage();
  saveToStorage([createdPost, ...existing]);
  return createdPost;
}

export async function updatePostAsync(
  id: string,
  input: UpdatePostInput,
  fallbackAuthor?: CurrentUser
): Promise<Post | null> {
  if (!getAccessToken()) {
    throw new Error("You must be logged in to update a post.");
  }

  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("text", input.text);
  if (input.imageFile) {
    formData.append("image", input.imageFile);
  }

  let response;
  try {
    response = await api.put(`/posts/${id}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }

  const backendPost = response.data as BackendPost;
  const updatedPost = mapBackendPost(backendPost, fallbackAuthor);
  const posts = loadFromStorage();
  const next = posts.map((p) => (p.id === id ? updatedPost : p));
  saveToStorage(next);
  return updatedPost;
}

/**
 * DELETE /posts/:id
 * Removes a post by id.
 */
export function deletePost(id: string): void {
  saveToStorage(loadFromStorage().filter((p) => p.id !== id));
}

/**
 * POST /posts/:id/like
 * Toggles the liked state and updates the like count.
 * Returns the updated post, or null if not found.
 */
export function syncPostCommentsCount(postId: string, commentsCount: number): void {
  saveToStorage(loadFromStorage().map((p) => p.id === postId ? { ...p, commentsCount } : p));
}

export async function toggleLike(id: string): Promise<Post | null> {
  const response = await api.post(`/likes/${id}`);
  const { liked, likesCount } = response.data as { liked: boolean; likesCount: number };

  const posts = loadFromStorage();
  let updated: Post | null = null;
  const next = posts.map((p) => {
    if (p.id !== id) return p;
    updated = { ...p, liked, likesCount };
    return updated;
  });
  if (!updated) return null;
  saveToStorage(next);
  return updated;
}


