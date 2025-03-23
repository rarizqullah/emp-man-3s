export type Database = {
  // Definisi tipe database Supabase
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {};
    Enums: {};
  };
}; 