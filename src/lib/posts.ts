import type { Post } from "../types/Post";

// ─── Public input/output types ───────────────────────────────────────────────

/** Fields required when creating a new post */
export type CreatePostInput = {
  title: string;
  text: string;
  imageUrl?: string;
};

/** Fields that can be changed when editing an existing post */
export type UpdatePostInput = {
  title: string;
  text: string;
  imageUrl?: string;
};

/** Re-export so pages only need one import */
export type { Post };

// ─── Private: minimal user shape ─────────────────────────────────────────────

type CurrentUser = {
  email: string;
  name?: string;
  avatar?: string;
};

// ─── Private: storage helpers ────────────────────────────────────────────────

const STORAGE_KEY = "movietalk_posts";

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

function buildOwnerSeedPost(user: CurrentUser): Post {
  return {
    id: "234",
    author: {
      id: "u-owner",
      username: user.name || user.email.split("@")[0],
      avatarUrl: user.avatar,
      email: user.email,
    },
    createdAt: "2h ago",
    title: "Best plot twists you did not see coming",
    text: "Drop your favorite twist movie without spoilers.",
    imageUrl: "/images/movie-collage-bg.jpg",
    likesCount: 128,
    commentsCount: 34,
    liked: true,
  };
}

/**
 * Ensures the store is populated for the active user.
 * Called internally by getAllPosts.
 */
function ensureSeed(currentUser: CurrentUser | null): Post[] {
  const existing = loadFromStorage();

  if (existing.length === 0) {
    const seed = currentUser
      ? [buildOwnerSeedPost(currentUser), ...SEED_COMMUNITY_POSTS]
      : SEED_COMMUNITY_POSTS;
    saveToStorage(seed);
    return seed;
  }

  // New user with no posts yet — prepend their seed post
  if (currentUser) {
    const hasOwnerPost = existing.some((p) => p.author.email === currentUser.email);
    if (!hasOwnerPost) {
      const withOwner = [buildOwnerSeedPost(currentUser), ...existing];
      saveToStorage(withOwner);
      return withOwner;
    }
  }

  return existing;
}

// ─── Public API ──────────────────────────────────────────────────────────────
// Each function maps 1-to-1 to a future REST endpoint.
// Replacing localStorage with fetch() only requires changes in this file.

/**
 * GET /posts
 * Returns all posts, initialising seed data for the current user if needed.
 */
export function getAllPosts(currentUser?: CurrentUser | null): Post[] {
  return ensureSeed(currentUser ?? null);
}

/**
 * GET /posts/:id
 * Returns a single post by id, or null if not found.
 */
export function getPostById(id: string): Post | null {
  return loadFromStorage().find((p) => p.id === id) ?? null;
}

/**
 * POST /posts
 * Creates and persists a new post; returns it.
 */
export function createPost(input: CreatePostInput, author: CurrentUser): Post {
  const posts = loadFromStorage();
  const newPost: Post = {
    id: crypto.randomUUID(),
    author: {
      id: `u-${author.email}`,
      username: author.name || author.email.split("@")[0],
      avatarUrl: author.avatar,
      email: author.email,
    },
    createdAt: "Just now",
    title: input.title,
    text: input.text,
    imageUrl: input.imageUrl,
    likesCount: 0,
    commentsCount: 0,
    liked: false,
  };
  saveToStorage([newPost, ...posts]);
  return newPost;
}

/**
 * PATCH /posts/:id
 * Updates editable fields; returns the updated post, or null if not found.
 */
export function updatePost(id: string, input: UpdatePostInput): Post | null {
  const posts = loadFromStorage();
  let updated: Post | null = null;
  const next = posts.map((p) => {
    if (p.id !== id) return p;
    updated = { ...p, ...input };
    return updated;
  });
  if (!updated) return null;
  saveToStorage(next);
  return updated;
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
export function toggleLike(id: string): Post | null {
  const posts = loadFromStorage();
  let updated: Post | null = null;
  const next = posts.map((p) => {
    if (p.id !== id) return p;
    const liked = !p.liked;
    updated = { ...p, liked, likesCount: p.likesCount + (liked ? 1 : -1) };
    return updated;
  });
  if (!updated) return null;
  saveToStorage(next);
  return updated;
}


