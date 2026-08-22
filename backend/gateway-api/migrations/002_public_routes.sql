
CREATE TABLE IF NOT EXISTS public_routes (
  id           SERIAL PRIMARY KEY,
  path         VARCHAR(255) NOT NULL UNIQUE,
  match_type   VARCHAR(10)  NOT NULL DEFAULT 'exact'
               CHECK (match_type IN ('exact', 'prefix')),
  is_system    BOOLEAN      NOT NULL DEFAULT FALSE,
  description  TEXT,
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_public_routes_path ON public_routes(path);

-- Seed your existing hardcoded list as system routes
INSERT INTO public_routes (path, match_type, is_system, description) VALUES
  ('/auth/login',                'exact',  TRUE, 'User login endpoint'),
  ('/auth/register',             'exact',  TRUE, 'User registration'),
  ('/auth/refresh',              'exact',  TRUE, 'Token refresh'),
  ('/auth/public-key',           'exact',  TRUE, 'JWT public key for verification'),
  ('/.well-known/acme-challenge', 'prefix', TRUE, 'Lets Encrypt HTTP-01 challenge'),
  ('/audio/health',              'exact',  TRUE, 'Audio service health check')
ON CONFLICT (path) DO NOTHING;