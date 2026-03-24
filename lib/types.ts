export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile // joined
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export interface Like {
  user_id: string
  post_id: string
  created_at: string
}
