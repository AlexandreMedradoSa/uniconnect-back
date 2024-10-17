const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

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
            .insert([
                { name, email, password_hash: hashedPassword }
            ]);

        if (insertError) {
            console.log(insertError)
            return res.status(500).json({ message: 'Erro ao registrar o usuário' });
        }

        res.status(201).json({ message: 'Usuário registrado com sucesso' });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Login de usuário
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !data) {
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        const validPassword = await bcrypt.compare(password, data.password_hash);

        if (!validPassword) {
            return res.status(400).json({ message: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: data.id, email: data.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Logout
exports.logout = (req, res) => {
    res.status(200).json({ message: 'Logout realizado com sucesso', token: null });
};

// Atualizar o Perfil do Usuário
exports.updateProfile = async (req, res) => {
    const { id } = req.user;
    const { nome_completo, descricao, curso, idade, semestre, interesses } = req.body;

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
                primeiro_login: false
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
            .select('nome, descricao, curso, idade, semestre, interesses')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ message: 'Usuário não encontrado' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Buscar os Interesses
exports.getInteresses = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('interesses')
            .select('*');

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
        const { error } = await supabase
            .from('interesses')
            .insert([{ nome }]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao adicionar interesse' });
        }

        res.status(201).json({ message: 'Interesse adicionado com sucesso' });
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
        const { error } = await supabase
            .from('interesses')
            .delete()
            .eq('id', id);

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
        const { data, error } = await supabase
            .from('cursos')
            .select('*');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar cursos' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Inserir Curso
exports.addCurso = async (req, res) => {
    const { nome } = req.body;

    try {
        const { error } = await supabase
            .from('cursos')
            .insert([{ nome }]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao adicionar curso' });
        }

        res.status(201).json({ message: 'Curso adicionado com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Editar Curso
exports.updateCurso = async (req, res) => {
    const { id } = req.params;
    const { nome } = req.body;

    try {
        const { error } = await supabase
            .from('cursos')
            .update({ nome })
            .eq('id', id);

        if (error) {
            return res.status(500).json({ message: 'Erro ao atualizar o curso' });
        }

        res.status(200).json({ message: 'Curso atualizado com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Deletar Curso
exports.deleteCurso = async (req, res) => {
    const { id } = req.params;

    try {
        const { error } = await supabase
            .from('cursos')
            .delete()
            .eq('id', id);

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
        const { data, error } = await supabase
            .from('grupos_estudo')
            .select('*');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar grupos de estudo' });
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
        const { error } = await supabase
            .from('grupos_estudo')
            .insert([
                { nome, descricao, curso, semestre, interesses, criador_id }
            ]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao criar grupo de estudo' });
        }

        res.status(201).json({ message: 'Grupo de estudo criado com sucesso' });
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
            return res.status(500).json({ message: 'Erro ao excluir o grupo de estudo' });
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
            return res.status(500).json({ message: 'Erro ao atualizar o grupo de estudo' });
        }

        res.status(200).json({ message: 'Grupo de estudo atualizado com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Listar Usuários em um Grupo de Estudo
exports.getUsuariosGrupoEstudo = async (req, res) => {
    const { id } = req.params;

    try {
        const { data, error } = await supabase
            .from('grupo_usuarios')
            .select('usuario_id, users.nome')
            .eq('grupo_id', id)
            .join('users', 'grupo_usuarios.usuario_id', 'users.id');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar usuários do grupo de estudo' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Adicionar Usuário a um Grupo de Estudo
exports.addUsuarioGrupoEstudo = async (req, res) => {
    const { id: grupo_id } = req.params;
    const { id: usuario_id } = req.user;

    try {
        const { error } = await supabase
            .from('grupo_usuarios')
            .insert([{ grupo_id, usuario_id }]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao adicionar usuário ao grupo de estudo' });
        }

        res.status(201).json({ message: 'Usuário adicionado ao grupo de estudo com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Remover Usuário de um Grupo de Estudo
exports.removeUsuarioGrupoEstudo = async (req, res) => {
    const { id: grupo_id } = req.params;
    const { id: usuario_id } = req.user;

    try {
        const { error } = await supabase
            .from('grupo_usuarios')
            .delete()
            .eq('grupo_id', grupo_id)
            .eq('usuario_id', usuario_id);

        if (error) {
            return res.status(500).json({ message: 'Erro ao remover o usuário do grupo de estudo' });
        }

        res.status(200).json({ message: 'Usuário removido do grupo de estudo com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
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
            return res.status(500).json({ message: 'Erro ao buscar grupos de estudo' });
        }

        res.status(200).json(data);
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

        const validPassword = await bcrypt.compare(senha_antiga, user.password_hash);

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
    const { id } = req.user;

    try {
        const { data, error } = await supabase
            .from('conexoes')
            .select('amigo_id, users.nome')
            .eq('usuario_id', id)
            .eq('status', 'aceito')
            .join('users', 'conexoes.amigo_id', 'users.id');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar conexões' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Adicionar Conexão entre Usuários
exports.addConexao = async (req, res) => {
    const { id: amigo_id } = req.params;
    const { id: usuario_id } = req.user;

    try {
        const { error } = await supabase
            .from('conexoes')
            .insert([{ usuario_id, amigo_id, status: 'pendente' }]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao enviar solicitação de conexão' });
        }

        res.status(201).json({ message: 'Solicitação de conexão enviada com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Aceitar ou Recusar Conexões
exports.aceitarConexao = async (req, res) => {
    const { id: amigo_id } = req.params;
    const { id: usuario_id } = req.user;

    try {
        const { error } = await supabase
            .from('conexoes')
            .update({ status: 'aceito' })
            .eq('usuario_id', amigo_id)
            .eq('amigo_id', usuario_id);

        if (error) {
            return res.status(500).json({ message: 'Erro ao aceitar solicitação de conexão' });
        }

        res.status(200).json({ message: 'Conexão aceita com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
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
            return res.status(500).json({ message: 'Erro ao recusar solicitação de conexão' });
        }

        res.status(200).json({ message: 'Conexão recusada com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Criar Evento Academico
exports.createEvento = async (req, res) => {
    const { nome, descricao, data, curso } = req.body;
    const { id: criador_id } = req.user;

    try {
        const { error } = await supabase
            .from('eventos')
            .insert([{ nome, descricao, data, curso, criador_id }]);

        if (error) {
            return res.status(500).json({ message: 'Erro ao criar evento' });
        }

        res.status(201).json({ message: 'Evento criado com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Listar Eventos Acadêmicos
exports.getEventos = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('eventos')
            .select('*');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar eventos' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Participar de Evento Acadêmico
exports.participarEvento = async (req, res) => {
    const { id: evento_id } = req.params;
    const { id: usuario_id } = req.user;

    try {
        const { data: evento, error } = await supabase
            .from('eventos')
            .select('limite_participantes, (SELECT COUNT(*) FROM evento_participantes WHERE evento_id = eventos.id) AS total_participantes')
            .eq('id', evento_id)
            .single();

        if (evento.total_participantes >= evento.limite_participantes) {
            return res.status(400).json({ message: 'Limite de participantes atingido' });
        }

        const { error: insertError } = await supabase
            .from('evento_participantes')
            .insert([{ evento_id, usuario_id }]);

        if (insertError) {
            return res.status(500).json({ message: 'Erro ao participar do evento' });
        }

        res.status(201).json({ message: 'Participação confirmada com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
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
    const { nome, descricao, data, curso } = req.body;

    try {
        const { error: updateError } = await supabase
            .from('eventos')
            .update({ nome, descricao, data, curso })
            .eq('id', id);

        if (updateError) {
            return res.status(500).json({ message: 'Erro ao atualizar evento' });
        }

        const { data: participantes } = await supabase
            .from('evento_participantes')
            .select('usuario_id')
            .eq('evento_id', id);

        for (const participante of participantes) {
            await enviarNotificacao(participante.usuario_id, 'O evento foi atualizado.');
        }

        res.status(200).json({ message: 'Evento atualizado com sucesso' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Histórico de Participação em Eventos
exports.getHistoricoParticipacao = async (req, res) => {
    const { id: usuario_id } = req.user;

    try {
        const { data, error } = await supabase
            .from('evento_participantes')
            .select('evento_id, eventos.nome, eventos.descricao, eventos.data')
            .eq('usuario_id', usuario_id)
            .join('eventos', 'evento_participantes.evento_id', 'eventos.id');

        if (error) {
            return res.status(500).json({ message: 'Erro ao buscar histórico de participação' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Erro no servidor' });
    }
};

// Função para Registrar Auditoria
const registrarAuditoria = async (grupo_id, usuario_id, acao) => {
    const { error } = await supabase
        .from('auditoria_grupos')
        .insert([{ grupo_id, usuario_id, acao }]);
    if (error) {
        console.log('Erro ao registrar auditoria:', error);
    }
};

// Função para Salvar/Enviar Notificações
const enviarNotificacao = async (usuario_id, mensagem) => {
    const { error } = await supabase
        .from('notificacoes')
        .insert([{ usuario_id, mensagem }]);
    if (error) {
        console.log('Erro ao enviar notificação:', error);
    }
};