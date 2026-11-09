INSERT INTO public.permissions (name, feature, action, description) VALUES
('read_communities','communities','read','View communities'),
('create_communities','communities','create','Create communities'),
('update_communities','communities','update','Edit communities'),
('delete_communities','communities','delete','Delete communities'),
('approve_communities','communities','approve','Review community access requests'),
('read_utility_services','utility_services','read','View utility services'),
('create_utility_services','utility_services','create','Create utility services'),
('update_utility_services','utility_services','update','Edit utility services'),
('delete_utility_services','utility_services','delete','Delete utility services'),
('read_combos','combos','read','View combo offers'),
('create_combos','combos','create','Create combo offers'),
('update_combos','combos','update','Edit combo offers'),
('delete_combos','combos','delete','Delete combo offers'),
('read_platform_margin','platform_margin','read','View platform margin'),
('update_platform_margin','platform_margin','update','Edit platform margin'),
('read_themes','themes','read','View themes'),
('update_themes','themes','update','Edit and publish themes'),
('read_deletion_requests','deletion_requests','read','View account deletion requests'),
('manage_deletion_requests','deletion_requests','manage','Process account deletion requests')
ON CONFLICT (name) DO NOTHING;

WITH m(old_p, new_p) AS (VALUES
 ('read_users','read_communities'),('update_users','update_communities'),('update_users','approve_communities'),('delete_users','delete_communities'),('create_users','create_communities'),
 ('read_services','read_utility_services'),('create_services','create_utility_services'),('update_services','update_utility_services'),('delete_services','delete_utility_services'),
 ('read_products','read_combos'),('create_products','create_combos'),('update_products','update_combos'),('delete_products','delete_combos'),
 ('read_products','read_platform_margin'),('update_products','update_platform_margin'),
 ('read_settings','read_themes'),('update_settings','update_themes'),
 ('read_users','read_deletion_requests'),('delete_users','manage_deletion_requests'),
 ('read_settings','read_chatbot'),('update_settings','update_chatbot'),
 ('read_settings','read_notifications'),('update_settings','create_notifications'),('update_settings','update_notifications'),('update_settings','delete_notifications'),
 ('read_settings','read_scratch_rewards'),('update_settings','create_scratch_rewards'),('update_settings','update_scratch_rewards'),('update_settings','delete_scratch_rewards'),
 ('create_stock','read_purchase'),('create_stock','create_purchase')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, np.id
FROM m
JOIN public.permissions op ON op.name = m.old_p
JOIN public.role_permissions rp ON rp.permission_id = op.id
JOIN public.permissions np ON np.name = m.new_p
WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions x WHERE x.role_id = rp.role_id AND x.permission_id = np.id);