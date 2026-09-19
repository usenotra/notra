CREATE TABLE "discussion_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"feedback_id" text,
	"shelf_source_id" text,
	"parent_id" text,
	"depth" integer DEFAULT 0 NOT NULL,
	"user_id" text,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"edited_at" timestamp,
	"deleted_at" timestamp,
	CONSTRAINT "discussionComments_target_check" CHECK (num_nonnulls("discussion_comments"."feedback_id", "discussion_comments"."shelf_source_id") = 1),
	CONSTRAINT "discussionComments_depth_check" CHECK ("discussion_comments"."depth" between 0 and 5)
);
--> statement-breakpoint
CREATE TABLE "discussion_reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"comment_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_feedback_id_agent_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."agent_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_shelf_source_id_geo_shelf_sources_id_fk" FOREIGN KEY ("shelf_source_id") REFERENCES "public"."geo_shelf_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_comments" ADD CONSTRAINT "discussion_comments_parent_id_discussion_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reactions" ADD CONSTRAINT "discussion_reactions_comment_id_discussion_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."discussion_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reactions" ADD CONSTRAINT "discussion_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussionComments_feedback_idx" ON "discussion_comments" USING btree ("feedback_id","created_at");--> statement-breakpoint
CREATE INDEX "discussionComments_shelf_idx" ON "discussion_comments" USING btree ("shelf_source_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "discussionReactions_unique" ON "discussion_reactions" USING btree ("comment_id","user_id","emoji");