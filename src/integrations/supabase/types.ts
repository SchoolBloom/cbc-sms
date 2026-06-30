export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          academic_year: string
          assessed_by: string | null
          assessment_type: string
          class_id: string
          comments: string | null
          core_competency_notes: string | null
          created_at: string
          id: string
          learning_area: string
          performance_level: string
          score: number | null
          school_id: string | null
          strand: string | null
          learner_id: string
          term: number
          values_notes: string | null
        }
        Insert: {
          academic_year: string
          assessed_by?: string | null
          assessment_type: string
          class_id: string
          comments?: string | null
          core_competency_notes?: string | null
          created_at?: string
          id?: string
          learning_area: string
          performance_level: string
          score?: number | null
          school_id?: string | null
          strand?: string | null
          learner_id: string
          term: number
          values_notes?: string | null
        }
        Update: {
          academic_year?: string
          assessed_by?: string | null
          assessment_type?: string
          class_id?: string
          comments?: string | null
          core_competency_notes?: string | null
          created_at?: string
          id?: string
          learning_area?: string
          performance_level?: string
          score?: number | null
          school_id?: string | null
          strand?: string | null
          learner_id?: string
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          school_id: string | null
          status: string
          learner_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id?: string | null
          status: string
          learner_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          school_id?: string | null
          status?: string
          learner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          created_at: string
          grade: string
          id: string
          school_id: string | null
          stream: string
          teacher_id: string | null
          term: number
          updated_at: string
        }
        Insert: {
          academic_year?: string
          created_at?: string
          grade: string
          id?: string
          school_id?: string | null
          stream: string
          teacher_id?: string | null
          term?: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          created_at?: string
          grade?: string
          id?: string
          school_id?: string | null
          stream?: string
          teacher_id?: string | null
          term?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          academic_year: string
          amount: number
          created_at: string
          due_date: string
          fee_type: string
          id: string
          paid_amount: number | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          school_id: string | null
          status: string
          learner_id: string
          term: number
          updated_at: string
        }
        Insert: {
          academic_year: string
          amount: number
          created_at?: string
          due_date: string
          fee_type: string
          id?: string
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          school_id?: string | null
          status?: string
          learner_id: string
          term: number
          updated_at?: string
        }
        Update: {
          academic_year?: string
          amount?: number
          created_at?: string
          due_date?: string
          fee_type?: string
          id?: string
          paid_amount?: number | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          school_id?: string | null
          status?: string
          learner_id?: string
          term?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          id: string
          location: string | null
          school_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          school_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          school_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      library_books: {
        Row: {
          author: string
          created_at: string
          id: string
          isbn: string | null
          school_id: string
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          isbn?: string | null
          school_id?: string
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          isbn?: string | null
          school_id?: string
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_books_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      library_loans: {
        Row: {
          book_id: string
          created_at: string
          due_date: string
          id: string
          issue_source: string
          issued_at: string
          issued_by_user_id: string
          lost_notes: string | null
          lost_reported_at: string | null
          return_notes: string | null
          returned_at: string | null
          school_id: string
          status: string
          learner_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          due_date: string
          id?: string
          issue_source: string
          issued_at?: string
          issued_by_user_id: string
          lost_notes?: string | null
          lost_reported_at?: string | null
          return_notes?: string | null
          returned_at?: string | null
          school_id?: string
          status?: string
          learner_id: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          due_date?: string
          id?: string
          issue_source?: string
          issued_at?: string
          issued_by_user_id?: string
          lost_notes?: string | null
          lost_reported_at?: string | null
          return_notes?: string | null
          returned_at?: string | null
          school_id?: string
          status?: string
          learner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_loans_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "library_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_loans_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
        ]
      }
      library_settings: {
        Row: {
          created_at: string
          daily_penalty_amount: number
          id: string
          loan_period_days: number
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_penalty_amount?: number
          id?: string
          loan_period_days?: number
          school_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_penalty_amount?: number
          id?: string
          loan_period_days?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          priority: string
          published: boolean | null
          published_at: string | null
          school_id: string | null
          target_audience: string[]
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published?: boolean | null
          published_at?: string | null
          school_id?: string | null
          target_audience?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          priority?: string
          published?: boolean | null
          published_at?: string | null
          school_id?: string | null
          target_audience?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          national_id_number: string | null
          occupation: string | null
          phone: string
          school_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          national_id_number?: string | null
          occupation?: string | null
          phone: string
          school_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          national_id_number?: string | null
          occupation?: string | null
          phone?: string
          school_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          school_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          school_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          admin_user_id: string | null
          administrator_email: string | null
          administrator_name: string | null
          administrator_phone: string | null
          code: string
          contact_email: string | null
          contact_phone: string | null
          county: string | null
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          school_categories: string[]
          status: string
          subcounty: string | null
          category: string
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          administrator_email?: string | null
          administrator_name?: string | null
          administrator_phone?: string | null
          code: string
          contact_email?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          school_categories?: string[]
          status?: string
          subcounty?: string | null
          category?: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          administrator_email?: string | null
          administrator_name?: string | null
          administrator_phone?: string | null
          code?: string
          contact_email?: string | null
          contact_phone?: string | null
          county?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          school_categories?: string[]
          status?: string
          subcounty?: string | null
          category?: string
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          school_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      learners: {
        Row: {
          admission_number: string
          assessment_number: string | null
          birth_certificate_number: string | null
          class_id: string | null
          created_at: string
          date_of_birth: string
          full_name: string
          gender: string
          id: string
          medical_notes: string | null
          parent_id: string | null
          parent_id_secondary: string | null
          pathway: string | null
          photo_url: string | null
          previous_school: string | null
          school_id: string | null
          senior_pathway: string | null
          status: string
          updated_at: string
          upi_number: string | null
        }
        Insert: {
          admission_number: string
          assessment_number?: string | null
          birth_certificate_number?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth: string
          full_name: string
          gender: string
          id?: string
          medical_notes?: string | null
          parent_id?: string | null
          parent_id_secondary?: string | null
          pathway?: string | null
          photo_url?: string | null
          previous_school?: string | null
          school_id?: string | null
          senior_pathway?: string | null
          status?: string
          updated_at?: string
          upi_number?: string | null
        }
        Update: {
          admission_number?: string
          assessment_number?: string | null
          birth_certificate_number?: string | null
          class_id?: string | null
          created_at?: string
          date_of_birth?: string
          full_name?: string
          gender?: string
          id?: string
          medical_notes?: string | null
          parent_id?: string | null
          parent_id_secondary?: string | null
          pathway?: string | null
          photo_url?: string | null
          school_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learners_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_parent_id_secondary_fkey"
            columns: ["parent_id_secondary"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learners_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      strands: {
        Row: {
          id: string
          code: string
          name: string
          learning_area: string
          grade_band: string
          description: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          learning_area: string
          grade_band: string
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          learning_area?: string
          grade_band?: string
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sub_strands: {
        Row: {
          id: string
          strand_id: string
          code: string
          name: string
          description: string | null
          rubric_levels: Json
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          strand_id: string
          code: string
          name: string
          description?: string | null
          rubric_levels?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          strand_id?: string
          code?: string
          name?: string
          description?: string | null
          rubric_levels?: Json
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_strands_strand_id_fkey"
            columns: ["strand_id"]
            isOneToOne: false
            referencedRelation: "strands"
            referencedColumns: ["id"]
          }
        ]
      }
      parent_links: {
        Row: {
          id: string
          school_id: string
          parent_id: string
          learner_id: string
          relationship: string
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          school_id?: string
          parent_id: string
          learner_id: string
          relationship?: string
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          parent_id?: string
          learner_id?: string
          relationship?: string
          is_primary?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_links_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_links_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          }
        ]
      }
      assessment_records: {
        Row: {
          id: string
          school_id: string
          learner_id: string
          learning_area: string
          strand_name: string | null
          sub_strand_name: string | null
          teacher_id: string
          term: number
          year: string
          rubric_score: string
          qualitative_notes: string | null
          core_competency_notes: string | null
          values_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id?: string
          learner_id: string
          learning_area: string
          strand_name?: string | null
          sub_strand_name?: string | null
          teacher_id: string
          term: number
          year: string
          rubric_score: string
          qualitative_notes?: string | null
          core_competency_notes?: string | null
          values_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          learner_id?: string
          learning_area?: string
          strand_name?: string | null
          sub_strand_name?: string | null
          teacher_id?: string
          term?: number
          year?: string
          rubric_score?: string
          qualitative_notes?: string | null
          core_competency_notes?: string | null
          values_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_records_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_records_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      sba_ingestion_batches: {
        Row: {
          id: string
          school_id: string
          uploaded_by: string
          filename: string
          status: string
          total_rows: number
          success_count: number
          error_count: number
          summary: Json
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          school_id?: string
          uploaded_by: string
          filename: string
          status?: string
          total_rows?: number
          success_count?: number
          error_count?: number
          summary?: Json
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          school_id?: string
          uploaded_by?: string
          filename?: string
          status?: string
          total_rows?: number
          success_count?: number
          error_count?: number
          summary?: Json
          created_at?: string
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sba_ingestion_batches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sba_ingestion_batches_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      ingestion_records: {
        Row: {
          id: string
          batch_id: string
          school_id: string
          row_number: number
          raw_data: Json
          status: string
          error_message: string | null
          assessment_record_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          batch_id: string
          school_id?: string
          row_number: number
          raw_data: Json
          status?: string
          error_message?: string | null
          assessment_record_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          batch_id?: string
          school_id?: string
          row_number?: number
          raw_data?: Json
          status?: string
          error_message?: string | null
          assessment_record_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingestion_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "sba_ingestion_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingestion_records_assessment_record_id_fkey"
            columns: ["assessment_record_id"]
            isOneToOne: false
            referencedRelation: "assessment_records"
            referencedColumns: ["id"]
          }
        ]
      }
      pathway_preferences: {
        Row: {
          id: string
          school_id: string
          learner_id: string
          rank: number
          pathway: string
          academic_year: string
          recorded_by: string | null
          preferred_school_name: string | null
          is_locked: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id?: string
          learner_id: string
          rank: number
          pathway: string
          academic_year: string
          recorded_by?: string | null
          preferred_school_name?: string | null
          is_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          learner_id?: string
          rank?: number
          pathway?: string
          academic_year?: string
          recorded_by?: string | null
          preferred_school_name?: string | null
          is_locked?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_preferences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_preferences_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_preferences_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      pathway_allocations: {
        Row: {
          id: string
          school_id: string
          learner_id: string
          pathway: string
          academic_year: string
          kjsea_score: number | null
          allocation_source: string
          finalized: boolean
          finalized_at: string | null
          finalized_by: string | null
          notes: string | null
          allocated_school_name: string | null
          allocated_school_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          school_id?: string
          learner_id: string
          pathway: string
          academic_year: string
          kjsea_score?: number | null
          allocation_source?: string
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          notes?: string | null
          allocated_school_name?: string | null
          allocated_school_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          school_id?: string
          learner_id?: string
          pathway?: string
          academic_year?: string
          kjsea_score?: number | null
          allocation_source?: string
          finalized?: boolean
          finalized_at?: string | null
          finalized_by?: string | null
          notes?: string | null
          allocated_school_name?: string | null
          allocated_school_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pathway_allocations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_allocations_learner_id_fkey"
            columns: ["learner_id"]
            isOneToOne: false
            referencedRelation: "learners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pathway_allocations_finalized_by_fkey"
            columns: ["finalized_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      academic_years: {
        Row: {
          id: string
          label: string
          start_date: string
          end_date: string
          current_term: number | null
          is_current: boolean | null
          term1_start: string | null
          term1_end: string | null
          term2_start: string | null
          term2_end: string | null
          term3_start: string | null
          term3_end: string | null
          school_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          label: string
          start_date: string
          end_date: string
          current_term?: number | null
          is_current?: boolean | null
          term1_start?: string | null
          term1_end?: string | null
          term2_start?: string | null
          term2_end?: string | null
          term3_start?: string | null
          term3_end?: string | null
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          label?: string
          start_date?: string
          end_date?: string
          current_term?: number | null
          is_current?: boolean | null
          term1_start?: string | null
          term1_end?: string | null
          term2_start?: string | null
          term2_end?: string | null
          term3_start?: string | null
          term3_end?: string | null
          school_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_years_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          }
        ]
      }
      subjects: {
        Row: {
          id: string
          name: string
          category: string
          pathway: string | null
          code: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          pathway?: string | null
          code?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          pathway?: string | null
          code?: string | null
          created_at?: string
        }
        Relationships: []
      }
      subject_assignments: {
        Row: {
          id: string
          school_id: string | null
          subject_id: string
          teacher_id: string | null
          class_id: string
          created_at: string
        }
        Insert: {
          id?: string
          school_id?: string | null
          subject_id: string
          teacher_id?: string | null
          class_id: string
          created_at?: string
        }
        Update: {
          id?: string
          school_id?: string | null
          subject_id?: string
          teacher_id?: string | null
          class_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_platform_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "parent" | "system_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "parent", "system_admin"],
    },
  },
} as const
