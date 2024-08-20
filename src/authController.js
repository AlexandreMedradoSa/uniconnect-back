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
