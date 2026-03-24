export interface Profile {
  id: string
  username: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  created_at: string
  // Extended profile fields
  hometown: string | null
  relationship_status: string | null
  birthday: string | null
  interests: string | null
  favorite_music: string | null
  favorite_books: string | null
  favorite_quotes: string | null
  activities: string | null
  college: string | null
  high_school: string | null
  employer: string | null
  work_period: string | null
  work_description: string | null
}

export interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile // joined
  likes?: { user_id: string }[] // joined
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

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: Profile
}
