const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

// Registro de usuário
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email);

    if (data.length > 0) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const { error: insertError } = await supabase
      .from('users')
      .insert([{ name, email, password_hash: hashedPassword }]);

    if (insertError) {
      console.log(insertError);
      return res.status(500).json({ message: 'Erro ao registrar o usuário' });
    }

    res.status(201).json({ message: 'Usuário registrado com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Login de usuário
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, password_hash, primeiro_login, is_admin')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    const validPassword = await bcrypt.compare(password, data.password_hash);

    if (!validPassword) {
      return res.status(400).json({ message: 'Credenciais inválidas' });
    }

    // Inclui is_admin no payload do token
    const token = jwt.sign(
      { id: data.id, email, is_admin: data.is_admin },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h',
      },
    );

    res.status(200).json({
      token,
      userId: data.id,
      primeiro_login: data.primeiro_login,
    });
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Logout
exports.logout = (req, res) => {
  res
    .status(200)
    .json({ message: 'Logout realizado com sucesso', token: null });
};

// Atualizar o Perfil do Usuário
exports.updateProfile = async (req, res) => {
  const { id } = req.user;
  const { nome_completo, descricao, curso, idade, semestre, interesses } =
    req.body;

  try {
    const { error } = await supabase
      .from('users')
      .update({
        nome: nome_completo,
        descricao,
        curso,
        idade,
        semestre,
        interesses,
        primeiro_login: false,
      })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao atualizar o perfil' });
    }

    res.status(200).json({ message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Visualizar Perfil do Usuário
exports.getUserProfile = async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('users')
      .select('name, email, curso, idade, semestre, interesses, descricao')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Erro ao buscar o perfil do usuário:', error);
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const userProfile = {
      ...data,
      interesses: Array.isArray(data.interesses) ? data.interesses : [],
    };

    res.status(200).json(userProfile);
  } catch (err) {
    console.error('Erro no servidor ao buscar perfil do usuário:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};
// Buscar usuários
exports.searchUsers = async (req, res) => {
  const { id: usuario_id } = req.user; // ID do usuário logado
  const { nome, curso, interesses } = req.query; // Nome, curso e interesses para pesquisa

  try {
    if (!nome && !curso && !interesses) {
      return res.status(400).json({
        message:
          'Pelo menos um filtro (nome, curso ou interesses) é obrigatório.',
      });
    }

    console.log('Iniciando busca com:', {
      usuario_id,
      nome,
      curso,
      interesses,
    });

    // Buscar conexões onde o usuário está envolvido, independentemente do status
    const { data: conexoes, error: conexoesError } = await supabase
      .from('conexoes')
      .select('amigo_id, usuario_id, status')
      .or(`usuario_id.eq.${usuario_id},amigo_id.eq.${usuario_id}`);

    if (conexoesError) {
      console.error('Erro ao buscar conexões:', conexoesError);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar conexões existentes.' });
    }

    console.log('Conexões encontradas:', conexoes);

    // IDs a serem excluídos: conexões existentes (independentemente do status) e o próprio usuário
    const idsExcluidos = new Set([
      usuario_id, // Excluir o próprio usuário
      ...conexoes.map((conexao) =>
        conexao.usuario_id === usuario_id
          ? conexao.amigo_id
          : conexao.usuario_id,
      ),
    ]);

    console.log('IDs a serem excluídos:', idsExcluidos);

    // Iniciar consulta para buscar usuários
    let query = supabase
      .from('users')
      .select('id, name, email, curso, semestre, interesses');

    // Adicionar filtro de nome, se fornecido
    if (nome) {
      query = query.ilike('name', `%${nome}%`);
    }

    // Adicionar filtro de curso, se fornecido
    if (curso) {
      query = query.eq('curso', curso);
    }

    // Adicionar filtro de interesses, se fornecido
    if (interesses) {
      const interessesArray = interesses.split(',').map((i) => i.trim());
      query = query.overlap('interesses', interessesArray);
    }

    // Executar consulta
    const { data: usuarios, error: userError } = await query;

    if (userError) {
      console.error('Erro ao buscar usuários:', userError);
      return res.status(500).json({ message: 'Erro ao buscar usuários.' });
    }

    console.log('Usuários encontrados:', usuarios);

    // Filtrar usuários que não estão na lista de IDs excluídos
    const usuariosFiltrados = usuarios.filter(
      (usuario) => !idsExcluidos.has(usuario.id),
    );

    console.log('Usuários filtrados:', usuariosFiltrados);

    res.status(200).json(usuariosFiltrados);
  } catch (err) {
    console.error('Erro ao processar busca:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Buscar os Interesses
exports.getInteresses = async (req, res) => {
  try {
    const { data, error } = await supabase.from('interesses').select('*');

    if (error) {
      return res.status(500).json({ message: 'Erro ao buscar interesses' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Inserir Interesse
exports.addInteresse = async (req, res) => {
  const { nome } = req.body;

  try {
    // Certifique-se de retornar o interesse inserido
    const { data, error } = await supabase
      .from('interesses')
      .insert([{ nome }])
      .select('*'); // Isso retorna o registro completo, incluindo o ID

    if (error) {
      return res.status(500).json({ message: 'Erro ao adicionar interesse' });
    }

    res.status(201).json(data[0]); // Retorne o primeiro registro inserido
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Editar Interesse
exports.updateInteresse = async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  try {
    const { error } = await supabase
      .from('interesses')
      .update({ nome })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao atualizar o interesse' });
    }

    res.status(200).json({ message: 'Interesse atualizado com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Excluir Interesse
exports.deleteInteresse = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from('interesses').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao excluir o interesse' });
    }

    res.status(200).json({ message: 'Interesse excluído com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Buscar os Cursos
exports.getCursos = async (req, res) => {
  try {
    const { data: cursos, error } = await supabase.from('cursos').select(`
        id,
        nome,
        curso_interesses (
          interesse_id
        )
      `);

    if (error) {
      return res.status(500).json({ message: 'Erro ao buscar cursos' });
    }

    // Mapear os interesses para cada curso
    const cursosComInteresses = await Promise.all(
      cursos.map(async (curso) => {
        const { data: interesses, error: interessesError } = await supabase
          .from('interesses')
          .select('id, nome')
          .in(
            'id',
            curso.curso_interesses.map((ci) => ci.interesse_id),
          );

        if (interessesError) {
          return { ...curso, interesses: [] };
        }

        return { ...curso, interesses };
      }),
    );

    res.status(200).json(cursosComInteresses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Inserir Curso
exports.addCurso = async (req, res) => {
  const { nome, curso_interesses } = req.body;

  try {
    // Inserir o curso
    const { data: cursoInserido, error: insertCursoError } = await supabase
      .from('cursos')
      .insert([{ nome }])
      .select('*')
      .single(); // Garantir que retornamos apenas o registro inserido

    if (insertCursoError) {
      return res.status(500).json({ message: 'Erro ao inserir curso' });
    }

    const cursoId = cursoInserido.id;

    // Verificar se curso_interesses foi enviado e é válido
    if (curso_interesses && Array.isArray(curso_interesses)) {
      const interessesParaInserir = curso_interesses.map((ci) => ({
        curso_id: cursoId,
        interesse_id: ci.interesse_id,
      }));

      const { error: insertInteressesError } = await supabase
        .from('curso_interesses')
        .insert(interessesParaInserir);

      if (insertInteressesError) {
        return res
          .status(500)
          .json({ message: 'Erro ao associar interesses ao curso' });
      }
    }

    res.status(201).json({ message: 'Curso inserido com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Editar Curso
exports.updateCurso = async (req, res) => {
  const { id } = req.params;
  const { nome, curso_interesses } = req.body;

  try {
    // Atualizar o nome do curso
    const { error: updateError } = await supabase
      .from('cursos')
      .update({ nome })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ message: 'Erro ao atualizar o curso' });
    }

    // Verificar se curso_interesses foi enviado
    if (curso_interesses && Array.isArray(curso_interesses)) {
      // Remover interesses existentes para este curso
      const { error: deleteError } = await supabase
        .from('curso_interesses')
        .delete()
        .eq('curso_id', id);

      if (deleteError) {
        return res
          .status(500)
          .json({ message: 'Erro ao remover interesses antigos do curso' });
      }

      // Adicionar os novos interesses associados
      const novosInteresses = curso_interesses.map((ci) => ({
        curso_id: id,
        interesse_id: ci.interesse_id,
      }));

      const { error: insertError } = await supabase
        .from('curso_interesses')
        .insert(novosInteresses);

      if (insertError) {
        return res
          .status(500)
          .json({ message: 'Erro ao adicionar novos interesses ao curso' });
      }
    }

    res.status(200).json({ message: 'Curso atualizado com sucesso' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Deletar Curso
exports.deleteCurso = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from('cursos').delete().eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao excluir o curso' });
    }

    res.status(200).json({ message: 'Curso excluído com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Listar Grupos de Estudo
exports.getGruposEstudo = async (req, res) => {
  try {
    const { data, error } = await supabase.from('grupos_estudo').select('*');

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao buscar grupos de estudo' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Criar Grupo de Estudo
exports.createGrupoEstudo = async (req, res) => {
  const { nome, descricao, curso, semestre, interesses } = req.body;
  const { id: criador_id } = req.user;

  try {
    // Insere o grupo de estudo e retorna o ID do grupo criado
    const { data, error } = await supabase
      .from('grupos_estudo')
      .insert([{ nome, descricao, curso, semestre, interesses, criador_id }])
      .select('id'); // Inclua 'id' ou os campos desejados

    if (error) {
      return res.status(500).json({ message: 'Erro ao criar grupo de estudo' });
    }

    if (data && data.length > 0) {
      return res.status(201).json({
        message: 'Grupo de estudo criado com sucesso',
        grupoId: data[0].id, // Retorna o ID do grupo criado
      });
    }

    return res.status(500).json({ message: 'Erro inesperado ao criar grupo' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Deletar Grupo de Estudo
exports.deleteGrupoEstudo = async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('grupos_estudo')
      .delete()
      .eq('id', id);

    if (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: 'Erro ao excluir o grupo de estudo' });
    }

    res.status(200).json({ message: 'Grupo de estudo excluído com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Atualizar Grupo de Estudo
exports.updateGrupoEstudo = async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, curso, semestre, interesses } = req.body;

  try {
    const { error } = await supabase
      .from('grupos_estudo')
      .update({ nome, descricao, curso, semestre, interesses })
      .eq('id', id);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao atualizar o grupo de estudo' });
    }

    res.status(200).json({ message: 'Grupo de estudo atualizado com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Listar Usuários em um Grupo de Estudo
exports.getUsuariosGrupoEstudo = async (req, res) => {
  const { id: grupo_id } = req.params;

  try {
    const { data: usuariosGrupo, error } = await supabase
      .from('grupo_usuarios')
      .select(
        `
        usuario_id,
        funcao,
        users (name) -- Ajuste aqui para o nome correto
      `,
      )
      .eq('grupo_id', grupo_id);

    if (error) {
      console.error('Erro ao buscar usuários do grupo:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar usuários do grupo de estudo.' });
    }

    const usuarios = usuariosGrupo.map((usuario) => ({
      id: usuario.usuario_id,
      nome: usuario.users.name, // Ajustado para o nome correto
      funcao: usuario.funcao,
    }));

    res.status(200).json(usuarios);
  } catch (error) {
    console.error('Erro no servidor ao buscar usuários do grupo:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Adicionar Usuário a um Grupo de Estudo
exports.addUsuarioGrupoEstudo = async (req, res) => {
  const { id: grupo_id } = req.params;
  const { id: usuario_id } = req.user;
  const { funcao } = req.body; // Obtém a função do corpo da requisição

  try {
    // Verificar se o usuário já está no grupo
    const { data: membroExistente, error: membroError } = await supabase
      .from('grupo_usuarios')
      .select('*')
      .eq('grupo_id', grupo_id)
      .eq('usuario_id', usuario_id)
      .single();

    if (membroExistente) {
      return res
        .status(400)
        .json({ message: 'Usuário já faz parte do grupo.' });
    }

    // Adicionar usuário ao grupo com função
    const { error } = await supabase
      .from('grupo_usuarios')
      .insert([{ grupo_id, usuario_id, funcao }]); // Inclui 'funcao' no insert

    if (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: 'Erro ao adicionar usuário ao grupo de estudo' });
    }

    // Registrar auditoria
    await registrarAuditoria(grupo_id, usuario_id, 'usuario_entrou');

    // Enviar notificação
    await enviarNotificacao(
      usuario_id,
      `Você entrou no grupo de estudo com ID ${grupo_id}.`,
    );

    res.status(201).json({
      message: 'Usuário adicionado ao grupo de estudo com sucesso',
      funcao, // Retorna a função atribuída no grupo
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Remover Usuário de um Grupo de Estudo
exports.removeUsuarioGrupoEstudo = async (req, res) => {
  const { id: grupo_id, usuario_id } = req.params; // Obter grupo_id e usuario_id da URL

  try {
    // Verificar se o usuário está no grupo
    const { data: membroExistente, error: membroError } = await supabase
      .from('grupo_usuarios')
      .select('*')
      .eq('grupo_id', grupo_id)
      .eq('usuario_id', usuario_id)
      .single();

    if (!membroExistente) {
      return res
        .status(400)
        .json({ message: 'O usuário especificado não faz parte do grupo.' });
    }

    // Remover usuário do grupo
    const { error } = await supabase
      .from('grupo_usuarios')
      .delete()
      .eq('grupo_id', grupo_id)
      .eq('usuario_id', usuario_id);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao remover o usuário do grupo de estudo' });
    }

    // Registrar auditoria
    await registrarAuditoria(grupo_id, usuario_id, 'usuario_removido');

    // Enviar notificação ao usuário removido
    await enviarNotificacao(
      usuario_id,
      `Você foi removido do grupo de estudo com ID ${grupo_id}.`,
    );

    res
      .status(200)
      .json({ message: 'Usuário removido do grupo de estudo com sucesso' });
  } catch (error) {
    console.error('Erro ao remover usuário do grupo:', error);
    res.status(500).json({ message: 'Erro no servidor ao remover usuário.' });
  }
};

// Pesquisar Grupos de Estudo
exports.searchGruposEstudo = async (req, res) => {
  const { nome, curso, semestre, interesses } = req.query;

  try {
    let query = supabase.from('grupos_estudo').select('*');

    if (nome) {
      query = query.ilike('nome', `%${nome}%`);
    }
    if (curso) {
      query = query.eq('curso', curso);
    }
    if (semestre) {
      query = query.eq('semestre', semestre);
    }
    if (interesses) {
      query = query.contains('interesses', [interesses]);
    }

    const { data, error } = await query;

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao buscar grupos de estudo' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Definir Administradores Grupos de Estudo
exports.definirAdministrador = async (req, res) => {
  const { grupo_id, usuario_id } = req.params;

  try {
    const { error } = await supabase
      .from('grupo_usuarios')
      .update({ funcao: 'administrador' })
      .eq('grupo_id', grupo_id)
      .eq('usuario_id', usuario_id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao definir administrador' });
    }

    // Registrar auditoria
    await registrarAuditoria(grupo_id, usuario_id, 'promovido_administrador');

    // Enviar notificação
    await enviarNotificacao(
      usuario_id,
      `Você foi promovido a administrador do grupo com ID ${grupo_id}.`,
    );

    res.status(200).json({ message: 'Administrador definido com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Arquivar Grupo de Estudo
exports.arquivarGrupo = async (req, res) => {
  const { id: grupo_id } = req.params;

  try {
    const { error } = await supabase
      .from('grupos_estudo')
      .update({ status: 'inativo' })
      .eq('id', grupo_id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao arquivar grupo' });
    }

    res.status(200).json({ message: 'Grupo arquivado com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Buscar notas
exports.getNotas = async (req, res) => {
  const { grupoId } = req.params;

  try {
    const { data, error } = await supabase
      .from('grupos_estudo')
      .select('notas')
      .eq('id', grupoId)
      .single();

    if (error) {
      console.error('Erro ao buscar notas:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar notas do grupo.' });
    }

    res.status(200).json(data.notas || '');
  } catch (err) {
    console.error('Erro no servidor ao buscar notas:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Atualizar notas
exports.updateNotas = async (req, res) => {
  const { grupoId } = req.params;
  const { notas } = req.body;

  try {
    console.log('Atualizando notas para o grupo:', grupoId, 'Notas:', notas);

    const { data, error } = await supabase
      .from('grupos_estudo') // Nome correto da tabela
      .update({ notas })
      .eq('id', grupoId);

    if (error) {
      console.error('Erro ao salvar notas:', error.message, error.details);
      return res.status(500).json({ message: 'Erro ao salvar notas.' });
    }

    res.status(200).json({ message: 'Notas salvas com sucesso!', data });
  } catch (err) {
    console.error('Erro no servidor ao salvar notas:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Buscar objetivos
exports.getObjetivos = async (req, res) => {
  const { grupoId } = req.params;

  try {
    const { data, error } = await supabase
      .from('objetivos')
      .select('*')
      .eq('grupo_id', grupoId);

    if (error) {
      console.error('Erro ao buscar objetivos:', error);
      return res.status(500).json({ message: 'Erro ao buscar objetivos.' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Erro no servidor ao buscar objetivos:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};
// Adicionar objetivo
exports.addObjetivo = async (req, res) => {
  const { grupoId } = req.params;
  const { descricao } = req.body;

  try {
    const { data, error } = await supabase
      .from('objetivos')
      .insert([{ grupo_id: grupoId, descricao }]);

    if (error) {
      console.error('Erro ao adicionar objetivo:', error);
      return res.status(500).json({ message: 'Erro ao adicionar objetivo.' });
    }

    res.status(201).json({ message: 'Objetivo adicionado com sucesso!', data });
  } catch (err) {
    console.error('Erro no servidor ao adicionar objetivo:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.updateObjetivoStatus = async (req, res) => {
  const { objetivoId } = req.params;
  const { status } = req.body;

  try {
    const { error } = await supabase
      .from('objetivos')
      .update({ status })
      .eq('id', objetivoId);

    if (error) {
      console.error('Erro ao atualizar status do objetivo:', error);
      return res.status(500).json({ message: 'Erro ao atualizar objetivo.' });
    }

    res
      .status(200)
      .json({ message: 'Status do objetivo atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro no servidor ao atualizar objetivo:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.deleteObjetivo = async (req, res) => {
  const { objetivoId } = req.params;

  try {
    const { error } = await supabase
      .from('objetivos')
      .delete()
      .eq('id', objetivoId);

    if (error) {
      console.error('Erro ao excluir objetivo:', error);
      return res.status(500).json({ message: 'Erro ao excluir objetivo.' });
    }

    res.status(200).json({ message: 'Objetivo excluído com sucesso!' });
  } catch (err) {
    console.error('Erro no servidor ao excluir objetivo:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Avaliar Grupo de Estudo
exports.enviarAvaliacaoGrupo = async (req, res) => {
  const { grupo_id } = req.params;
  const { avaliacao, feedback } = req.body;
  const { id: usuario_id } = req.user;

  try {
    const { error } = await supabase
      .from('avaliacoes_grupos')
      .insert([{ grupo_id, usuario_id, avaliacao, feedback }]);

    if (error) {
      return res.status(500).json({ message: 'Erro ao enviar avaliação' });
    }

    res.status(201).json({ message: 'Avaliação enviada com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Atualizar Senha de um Usuário
exports.updateSenha = async (req, res) => {
  const { id } = req.user; // usuario logado
  const { senha_antiga, senha_nova } = req.body;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', id)
      .single();

    const validPassword = await bcrypt.compare(
      senha_antiga,
      user.password_hash,
    );

    if (!validPassword) {
      return res.status(400).json({ message: 'Senha antiga inválida' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha_nova, salt);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ message: 'Erro ao atualizar a senha' });
    }

    res.status(200).json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Listar Conexões (Amigos) de um Usuário
exports.getConexoes = async (req, res) => {
  const { id } = req.user; // ID do usuário autenticado

  try {
    const { data, error } = await supabase
      .from('conexoes')
      .select(
        `
        id,
        amigo_id,
        usuario_id,
        users:conexoes_amigo_id_fkey (id, name, curso, semestre, interesses),
        users2:conexoes_usuario_id_fkey (id, name, curso, semestre, interesses)
      `,
      )
      .or(`usuario_id.eq.${id},amigo_id.eq.${id}`) // Verifica se o usuário está envolvido
      .eq('status', 'aceito');

    if (error) {
      console.error('Erro ao buscar conexões:', error);
      return res.status(500).json({ message: 'Erro ao buscar conexões.' });
    }

    // Transformar os dados para facilitar o consumo no frontend
    const conexoes = data.map((conexao) => {
      const isUserAsSender = conexao.usuario_id === id;
      const amigo = isUserAsSender ? conexao.users : conexao.users2;

      return {
        conexaoId: conexao.id, // ID único da conexão
        id: isUserAsSender ? conexao.amigo_id : conexao.usuario_id,
        name: amigo.name,
        curso: amigo.curso,
        semestre: amigo.semestre,
        interesses: amigo.interesses,
      };
    });

    // Remover conexões duplicadas com base no ID do usuário conectado
    const conexoesUnicas = conexoes.filter(
      (v, i, a) => a.findIndex((t) => t.id === v.id) === i,
    );

    res.status(200).json(conexoesUnicas);
  } catch (error) {
    console.error('Erro no servidor ao buscar conexões:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Listar solicitações de conexão pendentes
exports.getSolicitacoesPendentes = async (req, res) => {
  const { id } = req.user; // ID do usuário autenticado

  try {
    const { data, error } = await supabase
      .from('conexoes')
      .select(
        `
        usuario_id,
        users!conexoes_usuario_id_fkey (name, curso, semestre, interesses)
      `,
      )
      .eq('amigo_id', id) // Solicitações recebidas pelo usuário logado
      .eq('status', 'pendente');

    if (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar solicitações pendentes.' });
    }

    // Transformar os dados para facilitar o consumo no frontend
    const solicitacoes = data.map((solicitacao) => ({
      id: solicitacao.usuario_id,
      name: solicitacao.users.name,
      curso: solicitacao.users.curso,
      semestre: solicitacao.users.semestre,
      interesses: solicitacao.users.interesses,
    }));

    res.status(200).json(solicitacoes);
  } catch (error) {
    console.error('Erro no servidor ao buscar solicitações pendentes:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Listar solicitações de conexão enviadas pelo usuário
exports.getSolicitacoesEnviadas = async (req, res) => {
  const { id } = req.user; // ID do usuário autenticado

  try {
    const { data, error } = await supabase
      .from('conexoes')
      .select(
        `
        amigo_id,
        users!conexoes_amigo_id_fkey (name, curso, semestre, interesses)
      `,
      )
      .eq('usuario_id', id) // Solicitações enviadas pelo usuário logado
      .eq('status', 'pendente');

    if (error) {
      console.error('Erro ao buscar solicitações enviadas:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar solicitações enviadas.' });
    }

    // Transformar os dados para facilitar o consumo no frontend
    const solicitacoes = data.map((solicitacao) => ({
      id: solicitacao.amigo_id,
      name: solicitacao.users.name,
      curso: solicitacao.users.curso,
      semestre: solicitacao.users.semestre,
      interesses: solicitacao.users.interesses,
    }));

    res.status(200).json(solicitacoes);
  } catch (error) {
    console.error('Erro no servidor ao buscar solicitações enviadas:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};
// Adicionar Conexão entre Usuários
exports.addConexao = async (req, res) => {
  const { id: amigo_id } = req.params;
  const { id: usuario_id } = req.user;

  try {
    // Verificar se já existe uma conexão ou solicitação entre os usuários
    const { data: conexaoExistente, error: conexaoError } = await supabase
      .from('conexoes')
      .select('usuario_id, amigo_id, status')
      .or(`usuario_id.eq.${usuario_id},amigo_id.eq.${usuario_id}`)
      .or(`usuario_id.eq.${amigo_id},amigo_id.eq.${amigo_id}`);

    if (conexaoError) {
      console.error('Erro ao verificar conexões existentes:', conexaoError);
      return res.status(500).json({
        message: 'Erro ao verificar conexões existentes.',
      });
    }

    // Verificar se existe alguma conexão correspondente
    const conexao = conexaoExistente.find(
      (conexao) =>
        (conexao.usuario_id === usuario_id && conexao.amigo_id === amigo_id) ||
        (conexao.usuario_id === amigo_id && conexao.amigo_id === usuario_id),
    );

    if (conexao) {
      if (conexao.status === 'aceito') {
        return res.status(400).json({
          message: 'Você já está conectado com este usuário.',
        });
      } else if (conexao.status === 'pendente') {
        return res.status(400).json({
          message: 'Já existe uma solicitação de conexão pendente.',
        });
      } else if (conexao.status === 'recusado') {
        return res.status(400).json({
          message: 'A conexão foi recusada anteriormente.',
        });
      }
    }

    // Inserir nova solicitação de conexão
    const { error: insertError } = await supabase
      .from('conexoes')
      .insert([{ usuario_id, amigo_id, status: 'pendente' }]);

    if (insertError) {
      console.error('Erro ao inserir solicitação de conexão:', insertError);
      return res.status(500).json({
        message: 'Erro ao enviar solicitação de conexão.',
      });
    }

    res
      .status(201)
      .json({ message: 'Solicitação de conexão enviada com sucesso.' });
  } catch (error) {
    console.error('Erro no servidor ao enviar solicitação de conexão:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Aceitar ou Recusar Conexões
exports.aceitarConexao = async (req, res) => {
  const { id: amigo_id } = req.params; // ID do amigo que enviou a solicitação
  const { id: usuario_id } = req.user; // ID do usuário logado (quem aceita a solicitação)

  try {
    // Validar os IDs
    if (!usuario_id || !amigo_id || usuario_id === amigo_id) {
      return res.status(400).json({
        message: 'IDs de usuário inválidos. Verifique os dados enviados.',
      });
    }

    console.log('IDs validados para aceitar conexão:', {
      usuario_id,
      amigo_id,
    });

    // Verificar se a solicitação de conexão já existe e seu status
    const { data: conexaoExistente, error: findError } = await supabase
      .from('conexoes')
      .select('status')
      .eq('usuario_id', amigo_id)
      .eq('amigo_id', usuario_id)
      .single();

    if (findError) {
      console.error('Erro ao buscar solicitação:', findError);
      return res
        .status(500)
        .json({ message: 'Erro ao verificar a solicitação no banco.' });
    }

    if (!conexaoExistente) {
      return res
        .status(404)
        .json({ message: 'Solicitação de conexão não encontrada.' });
    }

    // Validar o status da solicitação
    if (conexaoExistente.status === 'aceito') {
      return res
        .status(400)
        .json({ message: 'Conexão já foi aceita anteriormente.' });
    }

    if (conexaoExistente.status === 'recusado') {
      return res
        .status(400)
        .json({ message: 'Conexão foi recusada anteriormente.' });
    }

    if (conexaoExistente.status === 'pendente') {
      // Atualizar o status da solicitação para "aceito"
      const { error: updateError } = await supabase
        .from('conexoes')
        .update({ status: 'aceito' })
        .eq('usuario_id', amigo_id)
        .eq('amigo_id', usuario_id);

      if (updateError) {
        console.error('Erro ao atualizar conexão:', updateError);
        return res
          .status(500)
          .json({ message: 'Erro ao atualizar a conexão no banco.' });
      }

      // Adicionar conexão inversa usando upsert para evitar duplicatas
      const { error: upsertError } = await supabase.from('conexoes').upsert([
        {
          usuario_id,
          amigo_id,
          status: 'aceito',
        },
      ]);

      if (upsertError) {
        console.error('Erro ao adicionar conexão inversa:', upsertError);
        return res
          .status(500)
          .json({ message: 'Erro ao adicionar a conexão inversa no banco.' });
      }

      console.log('Conexão aceita com sucesso:', { usuario_id, amigo_id });
      return res.status(200).json({ message: 'Conexão aceita com sucesso.' });
    }

    return res.status(400).json({ message: 'Estado inválido da solicitação.' });
  } catch (err) {
    console.error('Erro ao aceitar a conexão:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.getSugestoesConexoes = async (req, res) => {
  const { id: usuario_id } = req.user;

  try {
    // Obter os dados do usuário logado
    const { data: usuarioLogado, error: userError } = await supabase
      .from('users')
      .select('curso, interesses')
      .eq('id', usuario_id)
      .single();

    if (userError || !usuarioLogado) {
      console.error('Erro ao obter dados do usuário logado:', userError);
      return res
        .status(500)
        .json({ message: 'Erro ao obter dados do usuário logado.' });
    }

    const { curso, interesses } = usuarioLogado;

    // Obter IDs de conexões existentes
    const { data: conexoes, error: conexoesError } = await supabase
      .from('conexoes')
      .select('amigo_id, usuario_id')
      .or(`usuario_id.eq.${usuario_id},amigo_id.eq.${usuario_id}`);

    if (conexoesError) {
      console.error('Erro ao buscar conexões existentes:', conexoesError);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar conexões existentes.' });
    }

    const idsExcluidos = new Set([
      usuario_id,
      ...conexoes.map((conexao) =>
        conexao.usuario_id === usuario_id
          ? conexao.amigo_id
          : conexao.usuario_id,
      ),
    ]);

    // Criar array seguro para interesses
    const interessesArray = `{${interesses
      .map((interesse) => `"${interesse}"`)
      .join(',')}}`;

    // Buscar usuários com interesses ou curso semelhantes
    const { data: sugestoes, error: sugestoesError } = await supabase.rpc(
      'get_user_suggestions',
      {
        curso_param: curso,
        interesses_param: interessesArray,
        ids_excluidos: Array.from(idsExcluidos),
      },
    );

    if (sugestoesError) {
      console.error('Erro ao buscar sugestões:', sugestoesError);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar sugestões de conexões.' });
    }

    res.status(200).json(sugestoes);
  } catch (err) {
    console.error('Erro ao buscar sugestões de conexões:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Cancela uma solicitação de conexão enviada
exports.cancelarSolicitacao = async (req, res) => {
  const { id: amigo_id } = req.params;
  const { id: usuario_id } = req.user;

  try {
    const { error } = await supabase
      .from('conexoes')
      .delete()
      .eq('usuario_id', usuario_id)
      .eq('amigo_id', amigo_id)
      .eq('status', 'pendente');

    if (error) {
      console.error('Erro ao cancelar solicitação:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao cancelar a solicitação de conexão.' });
    }

    res
      .status(200)
      .json({ message: 'Solicitação de conexão cancelada com sucesso.' });
  } catch (err) {
    console.error('Erro no servidor ao cancelar solicitação:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.desfazerConexao = async (req, res) => {
  const { id: usuario_id } = req.user;
  const { amigo_id } = req.params;

  try {
    const { error } = await supabase
      .from('conexoes')
      .delete()
      .or(
        `and(usuario_id.eq.${usuario_id},amigo_id.eq.${amigo_id}),and(usuario_id.eq.${amigo_id},amigo_id.eq.${usuario_id})`,
      );

    if (error) {
      console.error('Erro ao desfazer conexão:', error);
      return res.status(500).json({ message: 'Erro ao desfazer conexão.' });
    }

    res.status(200).json({ message: 'Conexão desfeita com sucesso.' });
  } catch (err) {
    console.error('Erro no servidor ao desfazer conexão:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.recusarConexao = async (req, res) => {
  const { id: amigo_id } = req.params;
  const { id: usuario_id } = req.user;

  try {
    const { error } = await supabase
      .from('conexoes')
      .update({ status: 'recusado' })
      .eq('usuario_id', amigo_id)
      .eq('amigo_id', usuario_id);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao recusar solicitação de conexão' });
    }

    res.status(200).json({ message: 'Conexão recusada com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Bloquear conexão
exports.bloquearConexao = async (req, res) => {
  const { id: amigo_id } = req.params;
  const { id: usuario_id } = req.user;

  try {
    const { error } = await supabase
      .from('conexoes')
      .update({ status: 'bloqueado' })
      .eq('usuario_id', usuario_id)
      .eq('amigo_id', amigo_id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao bloquear conexão' });
    }

    res.status(200).json({ message: 'Conexão bloqueada com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Histórico de Conexões Aceitas e Recusadas
exports.getHistoricoConexoes = async (req, res) => {
  const { id: usuario_id } = req.user;

  try {
    const { data, error } = await supabase
      .from('conexoes')
      .select('amigo_id, status, data')
      .eq('usuario_id', usuario_id);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao buscar histórico de conexões' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Criar Evento Academico
exports.createEvento = async (req, res) => {
  const {
    nome,
    descricao,
    data,
    curso,
    limite_participantes,
    localizacao,
    observacoes_adicionais,
  } = req.body;

  const { id: criador_id } = req.user; // Obtém o ID do criador do token

  if (!data || isNaN(Date.parse(data))) {
    return res.status(400).json({ message: 'Data inválida ou não fornecida.' });
  }

  try {
    const { error } = await supabase.from('eventos').insert({
      nome,
      descricao,
      data: new Date(data).toISOString(),
      curso,
      limite_participantes,
      localizacao,
      observacoes_adicionais,
      criador_id, // Adiciona o criador_id ao evento
    });

    if (error) {
      console.error('Erro ao criar evento:', error);
      return res.status(500).json({ message: 'Erro ao criar evento.' });
    }

    res.status(201).json({ message: 'Evento criado com sucesso!' });
  } catch (err) {
    console.error('Erro no servidor ao criar evento:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Listar Eventos Acadêmicos
exports.getEventos = async (req, res) => {
  const { nome } = req.query; // Obtém o parâmetro 'nome' da URL

  try {
    const query = supabase.from('eventos').select(`
        id,
        nome,
        descricao,
        data,
        curso,
        limite_participantes,
        localizacao,
        observacoes_adicionais,
        criador_id,
        evento_participantes (usuario_id)
      `);

    // Aplica o filtro por nome, se fornecido
    if (nome) {
      query.ilike('nome', `%${nome}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar eventos:', error);
      return res.status(500).json({ message: 'Erro ao buscar eventos.' });
    }

    // Calcula o total de participantes baseado nos dados retornados
    const eventos = data.map((evento) => ({
      ...evento,
      total_participantes: evento.evento_participantes
        ? evento.evento_participantes.length
        : 0,
    }));

    res.status(200).json(eventos);
  } catch (err) {
    console.error('Erro no servidor ao buscar eventos:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.deleteEvento = async (req, res) => {
  const { id } = req.params; // ID do evento
  const { id: userId } = req.user; // ID do usuário autenticado

  try {
    // Verificar se o usuário é o criador do evento
    const { data: evento, error: fetchError } = await supabase
      .from('eventos')
      .select('criador_id')
      .eq('id', id)
      .single();

    if (fetchError || !evento) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }

    if (evento.criador_id !== userId) {
      return res.status(403).json({ message: 'Ação não autorizada.' });
    }

    // Excluir os participantes relacionados ao evento
    const { error: deleteParticipantsError } = await supabase
      .from('evento_participantes')
      .delete()
      .eq('evento_id', id);

    if (deleteParticipantsError) {
      console.error(
        'Erro ao excluir participantes do evento:',
        deleteParticipantsError,
      );
      return res
        .status(500)
        .json({ message: 'Erro ao excluir participantes do evento.' });
    }

    // Excluir o evento
    const { error: deleteEventError } = await supabase
      .from('eventos')
      .delete()
      .eq('id', id);

    if (deleteEventError) {
      console.error('Erro ao excluir evento:', deleteEventError);
      return res.status(500).json({ message: 'Erro ao excluir evento.' });
    }

    res.status(200).json({ message: 'Evento excluído com sucesso!' });
  } catch (err) {
    console.error('Erro ao excluir evento:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Participar de Evento Acadêmico
exports.participarEvento = async (req, res) => {
  const { id: eventoId } = req.params;
  const { id: userId } = req.user;

  const eventoIdNumerico = parseInt(eventoId, 10);
  if (!eventoIdNumerico || isNaN(eventoIdNumerico)) {
    return res.status(400).json({ message: 'ID do evento inválido.' });
  }

  if (!userId) {
    return res.status(400).json({ message: 'Usuário não autenticado.' });
  }

  try {
    const { data: evento, error: eventoError } = await supabase
      .from('eventos')
      .select(
        `
        id, 
        limite_participantes,
        evento_participantes (usuario_id)
      `,
      )
      .eq('id', eventoIdNumerico)
      .single();

    if (eventoError || !evento) {
      console.error('Evento não encontrado:', eventoError);
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }

    const totalParticipantes = evento.evento_participantes
      ? evento.evento_participantes.length
      : 0;

    if (
      evento.limite_participantes &&
      totalParticipantes >= evento.limite_participantes
    ) {
      return res
        .status(400)
        .json({ message: 'O evento já atingiu o limite de participantes.' });
    }

    const { error: insertError } = await supabase
      .from('evento_participantes')
      .insert({ evento_id: eventoIdNumerico, usuario_id: userId });

    if (insertError) {
      console.error('Erro ao registrar participação:', insertError);
      return res
        .status(500)
        .json({ message: 'Erro ao registrar participação no evento.' });
    }

    res.status(201).json({ message: 'Participação registrada com sucesso!' });
  } catch (err) {
    console.error('Erro no servidor ao participar do evento:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Cancelar Participação em Evento
exports.cancelarParticipacao = async (req, res) => {
  const { id: evento_id } = req.params;
  const { id: usuario_id } = req.user;

  try {
    const { error } = await supabase
      .from('evento_participantes')
      .delete()
      .eq('evento_id', evento_id)
      .eq('usuario_id', usuario_id);

    if (error) {
      return res.status(500).json({ message: 'Erro ao cancelar participação' });
    }

    res.status(200).json({ message: 'Participação cancelada com sucesso' });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Atualizar Evento
exports.updateEvento = async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    descricao,
    data,
    curso,
    limite_participantes,
    localizacao,
    observacoes_adicionais,
  } = req.body;
  const { id: userId } = req.user;
  try {
    const { data: evento, error: fetchError } = await supabase
      .from('eventos')
      .select('criador_id')
      .eq('id', id)
      .single();

    if (fetchError || !evento) {
      return res.status(404).json({ message: 'Evento não encontrado.' });
    }

    if (evento.criador_id !== userId) {
      return res.status(403).json({ message: 'Ação não autorizada.' });
    }

    const { error: updateError } = await supabase
      .from('eventos')
      .update({
        nome,
        descricao,
        data,
        curso,
        limite_participantes,
        localizacao,
        observacoes_adicionais,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao atualizar evento:', updateError);
      return res.status(500).json({ message: 'Erro ao atualizar evento.' });
    }

    res.status(200).json({ message: 'Evento atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao editar evento:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Histórico de Participação em Eventos
exports.getHistoricoParticipacao = async (req, res) => {
  const { id: usuario_id } = req.user;

  try {
    // Selecionar os eventos com base na tabela de participantes
    const { data, error } = await supabase
      .from('evento_participantes')
      .select('evento_id, eventos(nome, descricao, data)')
      .eq('usuario_id', usuario_id);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao buscar histórico de participação' });
    }

    // Transformar a resposta para simplificar o formato dos dados
    const historico = data.map((participacao) => ({
      id: participacao.evento_id,
      nome: participacao.eventos.nome,
      descricao: participacao.eventos.descricao,
      data: participacao.eventos.data,
    }));

    res.status(200).json(historico);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

exports.getEventoParticipantes = async (req, res) => {
  const { eventoId } = req.params;

  try {
    const { data: participantes, error } = await supabase
      .from('evento_participantes')
      .select(
        `
        usuario_id,
        users!evento_participantes_usuario_id_fkey (name, email)
      `,
      )
      .eq('evento_id', eventoId);

    if (error) {
      console.error('Erro ao buscar participantes do evento:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar participantes do evento.' });
    }

    res.status(200).json(participantes);
  } catch (err) {
    console.error('Erro no servidor ao buscar participantes do evento:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

// Obter detalhes de um grupo de estudo
exports.getGrupoById = async (req, res) => {
  const { id: grupo_id } = req.params;

  try {
    // Buscar informações do grupo pelo ID
    const { data: grupo, error: grupoError } = await supabase
      .from('grupos_estudo')
      .select('*')
      .eq('id', grupo_id)
      .single();

    if (grupoError || !grupo) {
      return res.status(404).json({ message: 'Grupo não encontrado.' });
    }

    res.status(200).json(grupo);
  } catch (error) {
    console.error('Erro ao buscar detalhes do grupo:', error);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

const registrarAuditoria = async (grupo_id, usuario_id, acao) => {
  const { error } = await supabase
    .from('auditoria_grupos')
    .insert([{ grupo_id, usuario_id, acao, data: new Date().toISOString() }]);
  if (error) {
    console.log('Erro ao registrar auditoria:', error);
  }
};

const enviarNotificacao = async (usuario_id, mensagem) => {
  const { error } = await supabase
    .from('notificacoes')
    .insert([{ usuario_id, mensagem, data: new Date().toISOString() }]);
  if (error) {
    console.log('Erro ao enviar notificação:', error);
  }
};

exports.getProfile = async (req, res) => {
  const { id } = req.user;

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(
        `
        id,
        name,
        email,
        descricao,
        curso,
        idade,
        semestre,
        is_admin,
        interesses
      `,
      )
      .eq('id', id)
      .single();

    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError.message);
      return res
        .status(500)
        .json({ message: 'Erro ao buscar dados do usuário.' });
    }

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao buscar perfil do usuário:', error.message);
    res.status(500).json({ message: 'Erro ao buscar perfil do usuário.' });
  }
};

// Listar administradores
exports.getAdmins = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('is_admin', true);

    if (error) {
      return res
        .status(500)
        .json({ message: 'Erro ao buscar administradores' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Erro ao buscar administradores:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Adicionar administrador
exports.addAdmin = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    console.error('Nenhum userId fornecido');
    return res.status(400).json({ message: 'userId é obrigatório' });
  }

  try {
    console.log('Atualizando is_admin para userId:', userId);
    const { error } = await supabase
      .from('users')
      .update({ is_admin: true })
      .eq('id', userId);

    if (error) {
      console.error('Erro ao atualizar is_admin:', error);
      return res
        .status(500)
        .json({ message: 'Erro ao adicionar administrador' });
    }

    res.status(200).json({ message: 'Administrador adicionado com sucesso!' });
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Remover administrador
exports.removeAdmin = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    console.error('Nenhum ID fornecido');
    return res.status(400).json({ message: 'ID é obrigatório' });
  }

  try {
    console.log('Removendo is_admin para ID:', id);
    const { error } = await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('id', id);

    if (error) {
      console.error('Erro ao remover administrador:', error);
      return res.status(500).json({ message: 'Erro ao remover administrador' });
    }

    res.status(200).json({ message: 'Administrador removido com sucesso!' });
  } catch (error) {
    console.error('Erro no servidor:', error);
    res.status(500).json({ message: 'Erro no servidor' });
  }
};

// Controlador para listar todos os usuários
exports.getAllUsers = async (req, res) => {
  try {
    console.log('Iniciando busca de usuários...');
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, is_admin');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro ao buscar usuários.' });
    }

    console.log('Usuários encontrados:', data);
    res.status(200).json(data);
  } catch (err) {
    console.error('Erro no servidor:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.getGruposDoUsuario = async (req, res) => {
  const { id } = req.user;

  try {
    const { data, error } = await supabase
      .from('grupo_usuarios')
      .select(
        `
        grupo_id,
        grupos_estudo!fk_grupo_usuarios_grupo_id (
          id, 
          nome, 
          descricao
        )
      `,
      )
      .eq('usuario_id', id);

    if (error) {
      console.error('Erro ao buscar grupos do usuário:', error);
      return res.status(500).json({ message: 'Erro ao buscar grupos.' });
    }

    const grupos = data.map((item) => item.grupos_estudo);
    res.status(200).json(grupos);
  } catch (err) {
    console.error('Erro no servidor ao buscar grupos:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.getEventosDoUsuario = async (req, res) => {
  const { id } = req.user;

  try {
    const { data, error } = await supabase
      .from('evento_participantes')
      .select(
        `
        evento_id,
        eventos (id, nome, descricao, data)
      `,
      )
      .eq('usuario_id', id);

    if (error) {
      console.error('Erro ao buscar eventos do usuário:', error);
      return res.status(500).json({ message: 'Erro ao buscar eventos.' });
    }

    const eventos = data.map((item) => item.eventos);
    res.status(200).json(eventos);
  } catch (err) {
    console.error('Erro no servidor ao buscar eventos:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.getMensagens = async (req, res) => {
  const { id: conexaoId } = req.params;

  try {
    const { data, error } = await supabase
      .from('mensagens')
      .select('id, conteudo, remetente_id, criado_em')
      .eq('conexao_id', conexaoId)
      .order('criado_em', { ascending: true });

    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return res.status(500).json({ message: 'Erro ao buscar mensagens.' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Erro no servidor ao buscar mensagens:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};

exports.enviarMensagem = async (req, res) => {
  const { id: conexaoId } = req.params; // O ID da conexão
  const { conteudo } = req.body;
  const { id: remetenteId } = req.user; // ID do usuário autenticado

  try {
    // Verificar se a conexão existe e se o usuário faz parte dela
    const { data: conexao, error: conexaoError } = await supabase
      .from('conexoes')
      .select('id, usuario_id, amigo_id')
      .eq('id', conexaoId)
      .single();

    if (conexaoError || !conexao) {
      return res.status(404).json({ message: 'Conexão não encontrada.' });
    }

    // Verificar se o usuário faz parte da conexão
    if (
      conexao.usuario_id !== remetenteId &&
      conexao.amigo_id !== remetenteId
    ) {
      return res.status(403).json({ message: 'Usuário não autorizado.' });
    }

    // Inserir a mensagem
    const { error: insertError } = await supabase.from('mensagens').insert({
      conexao_id: conexaoId, // O ID da conexão
      remetente_id: remetenteId,
      conteudo,
    });

    if (insertError) {
      console.error('Erro ao inserir mensagem:', insertError);
      return res.status(500).json({ message: 'Erro ao enviar mensagem.' });
    }

    res.status(201).json({ message: 'Mensagem enviada com sucesso!' });
  } catch (err) {
    console.error('Erro ao enviar mensagem:', err);
    res.status(500).json({ message: 'Erro no servidor.' });
  }
};
