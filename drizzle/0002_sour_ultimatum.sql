ALTER TABLE "briefs" RENAME TO "insights";--> statement-breakpoint
ALTER TABLE "insights" DROP CONSTRAINT "briefs_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "insights" DROP CONSTRAINT "briefs_confirmed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;