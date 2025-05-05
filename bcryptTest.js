const bcrypt = require('bcryptjs');

const password = '19980624';  // Le mot de passe en clair

console.log('Début du hachage...');

// Hash du mot de passe
bcrypt.hash(password, 10, (err, hashedPassword) => {
  if (err) {
    console.error('Erreur lors du hachage :', err);
    return;
  }
  console.log('Mot de passe haché:', hashedPassword);  // Afficher le mot de passe haché
});

console.log('Fin du script...');
