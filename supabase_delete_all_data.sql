-- =====================================================
-- SCRIPT PARA DELETAR TODOS OS DADOS (EXCETO CLIENTES)
-- =====================================================
-- ATENÇÃO: Este script irá deletar PERMANENTEMENTE:
-- - Todos os usuários do sistema
-- - Todos os dados de todas as tabelas (exceto clients)
-- 
-- Execute com cuidado! Esta ação NÃO pode ser desfeita.
-- =====================================================

-- 1. Primeiro, deletar tabelas que dependem de outras (foreign keys)
DELETE FROM approval_comments;

-- 2. Deletar tabelas principais
DELETE FROM approvals;
DELETE FROM contents;
DELETE FROM ideas;
DELETE FROM tasks;
DELETE FROM missions;
DELETE FROM suggestions;
DELETE FROM employees;

-- 3. Deletar todos os usuários do auth.users
DELETE FROM auth.users;

-- 4. Verificar contagens após exclusão
SELECT 'approval_comments' as tabela, COUNT(*) as registros FROM approval_comments
UNION ALL SELECT 'approvals', COUNT(*) FROM approvals
UNION ALL SELECT 'contents', COUNT(*) FROM contents
UNION ALL SELECT 'ideas', COUNT(*) FROM ideas
UNION ALL SELECT 'tasks', COUNT(*) FROM tasks
UNION ALL SELECT 'missions', COUNT(*) FROM missions
UNION ALL SELECT 'suggestions', COUNT(*) FROM suggestions
UNION ALL SELECT 'employees', COUNT(*) FROM employees
UNION ALL SELECT 'clients (MANTIDOS)', COUNT(*) FROM clients
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users;
