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

// Inserir Interesses
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

// Editar Interesses
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

// Excluir Interesses
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

// Inserir Cursos
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

// Editar Cursos
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

