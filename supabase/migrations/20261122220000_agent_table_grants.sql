-- The agent tables were created without table privileges, so row level security never got to run:
-- every read or write from the agent failed with "permission denied". Each grant matches the
-- table's policies; nothing is granted to anon.
grant select, insert, update on public.agent_proposals to authenticated;
grant select, insert, update, delete on public.agent_entities to authenticated;
grant select, insert, update, delete on public.agent_edges to authenticated;
grant select, insert on public.agent_episodes to authenticated;
